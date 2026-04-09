/*
Copyright 2026 Joao Costa <me@joaocosta.dev>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

(function () {
    "use strict";

    const content = document.getElementById("content");
    const shareBtn = document.getElementById("share");
    const cancelBtn = document.getElementById("cancel");

    /** @type {Record<string, string>} */
    var strings = {};

    let selectedType = "none";
    let selectedNode = null;
    let isSubmitting = false;

    function getAppName(node) {
        return (
            node["application.name"] ||
            node["application.process.binary"] ||
            node["node.name"] ||
            strings.unknownApplication
        );
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function selectOption(option) {
        content.querySelectorAll(".option").forEach(function (o) {
            o.setAttribute("aria-checked", "false");
            o.setAttribute("tabindex", "-1");
        });
        option.setAttribute("aria-checked", "true");
        option.setAttribute("tabindex", "0");
        option.focus();

        selectedType = option.dataset.type;
        if (option.dataset.node) {
            try {
                selectedNode = JSON.parse(option.dataset.node);
            } catch (e) {
                selectedNode = null;
            }
        } else {
            selectedNode = null;
        }
    }

    function handleKeyDown(e) {
        const options = Array.from(content.querySelectorAll(".option"));
        const currentIndex = options.findIndex(function (o) {
            return o.getAttribute("aria-checked") === "true";
        });

        let nextIndex = currentIndex;

        switch (e.key) {
            case "ArrowDown":
            case "ArrowRight":
                e.preventDefault();
                nextIndex = (currentIndex + 1) % options.length;
                break;
            case "ArrowUp":
            case "ArrowLeft":
                e.preventDefault();
                nextIndex = (currentIndex - 1 + options.length) % options.length;
                break;
            case "Home":
                e.preventDefault();
                nextIndex = 0;
                break;
            case "End":
                e.preventDefault();
                nextIndex = options.length - 1;
                break;
            case " ":
                e.preventDefault();
                return;
            default:
                return;
        }

        if (nextIndex !== currentIndex && options[nextIndex]) {
            selectOption(options[nextIndex]);
        }
    }

    function renderOptions(sources) {
        const targets = sources.targets || [];

        const appMap = new Map();
        for (const node of targets) {
            const name = getAppName(node);
            if (!appMap.has(name)) {
                const stableNode = {};
                if (node["application.name"]) {
                    stableNode["application.name"] = node["application.name"];
                } else if (node["node.name"]) {
                    stableNode["node.name"] = node["node.name"];
                }
                appMap.set(name, stableNode);
            }
        }

        const apps = Array.from(appMap.entries()).sort(function (a, b) {
            return a[0].localeCompare(b[0]);
        });

        let html = '<div role="radiogroup" aria-label="' + escapeHtml(strings.title) + '">';

        html +=
            '\
            <div class="option" role="radio" aria-checked="true" tabindex="0" data-type="none">\
                <div class="option-radio" aria-hidden="true"></div>\
                <div class="option-content">\
                    <div class="option-label">' +
            escapeHtml(strings.noAudioLabel) +
            '</div>\
                    <div class="option-description">' +
            escapeHtml(strings.noAudioDescription) +
            '</div>\
                </div>\
            </div>\
            <div class="option" role="radio" aria-checked="false" tabindex="-1" data-type="system">\
                <div class="option-radio" aria-hidden="true"></div>\
                <div class="option-content">\
                    <div class="option-label">' +
            escapeHtml(strings.systemLabel) +
            '</div>\
                    <div class="option-description">' +
            escapeHtml(strings.systemDescription) +
            "</div>\
                </div>\
            </div>";

        if (apps.length > 0) {
            html +=
                '<div class="section-header">' +
                escapeHtml(strings.applicationsHeader) +
                '</div><div class="app-list">';
            for (const [name, node] of apps) {
                const nodeJson = JSON.stringify(node).replace(/"/g, "&quot;");
                html +=
                    '\
                <div class="option" role="radio" aria-checked="false" tabindex="-1" data-type="app" data-node="' +
                    nodeJson +
                    '">\
                    <div class="option-radio" aria-hidden="true"></div>\
                    <div class="option-content">\
                        <div class="option-label">' +
                    escapeHtml(name) +
                    "</div>\
                    </div>\
                </div>";
            }
            html += "</div>";
        } else {
            html += '<div class="no-apps">' + escapeHtml(strings.noApps) + "</div>";
        }

        html += "</div>";

        content.className = "options-container";
        content.innerHTML = html;

        content.querySelectorAll(".option").forEach(function (option) {
            option.addEventListener("click", function () {
                selectOption(option);
            });
        });

        const radiogroup = content.querySelector('[role="radiogroup"]');
        if (radiogroup) {
            radiogroup.addEventListener("keydown", handleKeyDown);
        }

        shareBtn.disabled = false;
        const firstOption = content.querySelector(".option");
        if (firstOption) {
            firstOption.focus();
        }
    }

    function submit() {
        if (isSubmitting || shareBtn.disabled) return;
        isSubmitting = true;
        shareBtn.disabled = true;

        const selection = { type: selectedType };
        if (selectedNode) {
            selection.node = selectedNode;
        }
        window.audioPickerAPI.submitSelection(selection);
    }

    function cancel() {
        if (isSubmitting) return;
        isSubmitting = true;
        window.audioPickerAPI.cancel();
    }

    function showError(message) {
        content.className = "";
        content.innerHTML = '<div class="error">' + escapeHtml(message) + "</div>";
        shareBtn.disabled = false;
    }

    shareBtn.addEventListener("click", submit);
    cancelBtn.addEventListener("click", cancel);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !shareBtn.disabled) {
            e.preventDefault();
            submit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    });

    async function init() {
        try {
            const config = await window.audioPickerAPI.getConfig();
            document.documentElement.classList.add("cpd-theme-" + (config.theme || "dark"));

            strings = await window.audioPickerAPI.getStrings();

            document.getElementById("page-title").textContent = strings.title;
            document.getElementById("heading").textContent = strings.title;
            document.getElementById("subtitle").textContent = strings.subtitle;
            document.getElementById("loading-text").textContent = strings.loading;
            cancelBtn.textContent = strings.cancel;
            shareBtn.textContent = strings.share;

            const sources = await window.audioPickerAPI.getSources();

            if (sources.ok) {
                renderOptions(sources);
            } else {
                const errorMsg = sources.isGlibcOutdated
                    ? strings.errorGlibc
                    : strings.errorPipewire;
                showError(strings.errorLoadPrefix + " " + errorMsg);
            }
        } catch (err) {
            showError((strings.errorLoadPrefix || "Unable to load audio sources.") + " " + err.message);
        }
    }

    init();
})();