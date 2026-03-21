/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type FC, memo } from "react";

import { type CallParticipant } from "./RoomListItemView";
import { _t } from "../../utils/i18n";
import styles from "./CallParticipantsView.module.css";

export interface CallParticipantsViewProps {
    /** List of call participants */
    participants: CallParticipant[];
    /** Function to render avatar for a participant */
    renderAvatar: (participant: CallParticipant) => React.ReactNode;
}

/**
 * A component that displays call participants in a Discord-like list.
 */
export const CallParticipantsView: FC<CallParticipantsViewProps> = memo(function CallParticipantsView({
    participants,
    renderAvatar,
}) {
    if (participants.length === 0) {
        return null;
    }

    const summaryText = _t("voip|n_people_in_call", { count: participants.length });

    return (
        <div className={styles.container}>
            <div className={styles.summary}>
                <span className={styles.summaryText}>{summaryText}</span>
            </div>
            <div className={styles.membersList}>
                {participants.map((p) => (
                    <div key={p.userId} className={styles.memberItem}>
                        {renderAvatar(p)}
                        <span className={styles.memberName}>{p.displayName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});
