/*
Copyright 2026 Joao Costa <me@joaocosta.dev>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { BrowserWindow, ipcMain, nativeTheme } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AudioSelection, VenmicListResult } from "./@types/audio-sharing.js";
import { _t } from "./language-helper.js";
import { tryPaths } from "./utils.js";
import { listVenmicNodes, startVenmicDirect, startVenmicSystemDirect, stopVenmicDirect } from "./venmic.js";

export type { AudioSelection } from "./@types/audio-sharing.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let audioPickerPathPromise: Promise<string> | undefined;

async function getAudioPickerHtmlPath(): Promise<string> {
    if (!audioPickerPathPromise) {
        audioPickerPathPromise = tryPaths("audio-picker", __dirname, [
            "../build/audio-picker.html",
            "../../build/audio-picker.html",
        ]);
    }
    return audioPickerPathPromise;
}

/**
 * Shows a native dialog for selecting audio sources to share.
 * Returns the user's selection or "none" if cancelled.
 */
export async function showAudioPicker(parentWindow: BrowserWindow): Promise<AudioSelection> {
    const audioSources = listVenmicNodes();

    if (!audioSources.ok || !audioSources.hasPipewirePulse) {
        console.log("venmic not available or no PipeWire, skipping audio picker");
        return { type: "none" };
    }

    const htmlPath = await getAudioPickerHtmlPath();

    let compoundTheme = "";
    try {
        const themeClass: string = await parentWindow.webContents.executeJavaScript(
            `[...document.body.classList].find(c => c.startsWith("cpd-theme-")) || ""`,
        );
        compoundTheme = themeClass.replace("cpd-theme-", "");
    } catch (e) {
        console.warn("audio-picker: failed to detect theme from parent window:", e);
    }

    if (!compoundTheme) {
        compoundTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
    }

    return new Promise((resolve) => {
        const pickerWindow = new BrowserWindow({
            parent: parentWindow,
            modal: true,
            width: 420,
            height: 520,
            resizable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            title: _t("audio_picker|title"),
            webPreferences: {
                preload: join(__dirname, "audio-picker-preload.cjs"),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
            },
        });

        pickerWindow.setMenu(null);

        let resolved = false;

        const handleResult = (_event: Electron.IpcMainEvent, selection: AudioSelection): void => {
            if (resolved) return;
            resolved = true;
            cleanup();
            pickerWindow.close();
            resolve(selection);
        };

        const handleGetSources = (): VenmicListResult => {
            console.log("audio-picker: getSources called, returning", audioSources.targets?.length, "sources");
            return audioSources;
        };

        const handleGetConfig = (): { theme: string } => ({ theme: compoundTheme });

        const handleGetStrings = (): Record<string, string> => ({
            title: _t("audio_picker|title"),
            subtitle: _t("audio_picker|subtitle"),
            loading: _t("audio_picker|loading"),
            share: _t("audio_picker|share"),
            cancel: _t("action|cancel"),
            noAudioLabel: _t("audio_picker|no_audio_label"),
            noAudioDescription: _t("audio_picker|no_audio_description"),
            systemLabel: _t("audio_picker|system_label"),
            systemDescription: _t("audio_picker|system_description"),
            applicationsHeader: _t("audio_picker|applications_header"),
            noApps: _t("audio_picker|no_apps"),
            errorLoadPrefix: _t("audio_picker|error_load_prefix"),
            errorGlibc: _t("audio_picker|error_glibc"),
            errorPipewire: _t("audio_picker|error_pipewire"),
            unknownApplication: _t("audio_picker|unknown_application"),
        });

        const cleanup = (): void => {
            ipcMain.removeListener("audio-picker-result", handleResult);
            ipcMain.removeHandler("audio-picker-get-config");
            ipcMain.removeHandler("audio-picker-get-sources");
            ipcMain.removeHandler("audio-picker-get-strings");
        };

        ipcMain.on("audio-picker-result", handleResult);
        ipcMain.handle("audio-picker-get-config", handleGetConfig);
        ipcMain.handle("audio-picker-get-sources", handleGetSources);
        ipcMain.handle("audio-picker-get-strings", handleGetStrings);

        pickerWindow.on("closed", () => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve({ type: "none" });
            }
        });

        pickerWindow.webContents.on("console-message", (_event, _level, message) => {
            console.log("audio-picker renderer:", message);
        });

        pickerWindow.loadFile(htmlPath);
    });
}

/**
 * Shows audio picker and starts venmic based on user selection.
 * Returns true if audio was started, false otherwise.
 */
export async function showAudioPickerAndStart(parentWindow: BrowserWindow): Promise<boolean> {
    const selection = await showAudioPicker(parentWindow);

    switch (selection.type) {
        case "system":
            return startVenmicSystemDirect([]) ?? false;
        case "app":
            if (selection.node) {
                return startVenmicDirect([selection.node]) ?? false;
            }
            return false;
        default:
            stopVenmicDirect();
            return false;
    }
}
