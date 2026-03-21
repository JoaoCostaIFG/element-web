/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, type JSX, type ReactNode } from "react";
import {
    RoomListView as SharedRoomListView,
    useCreateAutoDisposedViewModel,
    type Room as SharedRoom,
    type CallParticipant,
} from "@element-hq/web-shared-components";
import { type Room } from "matrix-js-sdk/src/matrix";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { RoomAvatarView } from "../../avatars/RoomAvatarView";
import BaseAvatar from "../../avatars/BaseAvatar";
import { getKeyBindingsManager } from "../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../accessibility/KeyboardShortcuts";
import { Landmark, LandmarkNavigation } from "../../../../accessibility/LandmarkNavigation";
import { RoomListViewViewModel } from "../../../../viewmodels/room-list/RoomListViewViewModel";

/**
 * RoomListView component using shared components with proper MVVM pattern.
 */
export function RoomListView(): JSX.Element {
    const matrixClient = useMatrixClientContext();

    // Create and auto-dispose ViewModel instance
    const vm = useCreateAutoDisposedViewModel(() => new RoomListViewViewModel({ client: matrixClient }));

    // Render avatar for each room - memoized to prevent re-renders
    const renderAvatar = useCallback((room: SharedRoom): ReactNode => {
        return <RoomAvatarView room={room as Room} />;
    }, []);

    // Render avatar for each call participant - memoized to prevent re-renders
    const renderCallParticipantAvatar = useCallback((participant: CallParticipant): ReactNode => {
        return (
            <BaseAvatar
                name={participant.displayName}
                idName={participant.userId}
                url={participant.avatarUrl ?? undefined}
                size="24px"
            />
        );
    }, []);

    // Handle keyboard navigation for landmarks
    const onKeyDown = useCallback((ev: React.KeyboardEvent) => {
        const navAction = getKeyBindingsManager().getNavigationAction(ev);
        if (navAction === KeyBindingAction.NextLandmark || navAction === KeyBindingAction.PreviousLandmark) {
            LandmarkNavigation.findAndFocusNextLandmark(
                Landmark.ROOM_LIST,
                navAction === KeyBindingAction.PreviousLandmark,
            );
            ev.stopPropagation();
            ev.preventDefault();
        }
    }, []);

    return (
        <SharedRoomListView
            vm={vm}
            renderAvatar={renderAvatar}
            renderCallParticipantAvatar={renderCallParticipantAvatar}
            onKeyDown={onKeyDown}
        />
    );
}
