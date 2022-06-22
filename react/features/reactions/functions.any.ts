import { v4 as uuidv4 } from 'uuid';

// @ts-ignore
import { getFeatureFlag, REACTIONS_ENABLED } from '../base/flags';
// @ts-ignore
import { getLocalParticipant } from '../base/participants';
// @ts-ignore
import { extractFqnFromPath } from '../dynamic-branding/functions.any';

import { ReactionEmojiProps, REACTIONS, ReactionThreshold, SOUNDS_THRESHOLDS } from './constants';
import logger from './logger';

/**
 * Returns the queue of reactions.
 *
 * @param {Object} state - The state of the application.
 */
export function getReactionsQueue(state: any): Array<ReactionEmojiProps> {
    return state['features/reactions'].queue;
}

/**
 * Returns chat message from reactions buffer.
 *
 * @param {Array} buffer - The reactions buffer.
 */
export function getReactionMessageFromBuffer(buffer: Array<string>): string {
    return buffer.map<string>(reaction => REACTIONS[reaction].message).reduce((acc, val) => `${acc}${val}`);
}

/**
 * Returns reactions array with uid.
 *
 * @param {Array} buffer - The reactions buffer.
 */
export function getReactionsWithId(buffer: Array<string>): Array<ReactionEmojiProps> {
    return buffer.map<ReactionEmojiProps>(reaction => {
        return {
            reaction,
            uid: uuidv4()
        };
    });
}

/**
 * Sends reactions to the backend.
 *
 * @param {Object} state - The redux state object.
 * @param {Array} reactions - Reactions array to be sent.
 */
export async function sendReactionsWebhook(state: any, reactions: Array<string>) {
    const { webhookProxyUrl: url } = state['features/base/config'];
    const { conference } = state['features/base/conference'];
    const { jwt } = state['features/base/jwt'];
    const { connection } = state['features/base/connection'];
    const jid = connection.getJid();
    const localParticipant = getLocalParticipant(state);

    const headers = {
        ...jwt ? { 'Authorization': `Bearer ${jwt}` } : {},
        'Content-Type': 'application/json'
    };


    const reqBody = {
        meetingFqn: extractFqnFromPath(),
        sessionId: conference.sessionId,
        submitted: Date.now(),
        reactions,
        participantId: localParticipant.jwtId,
        participantName: localParticipant.name,
        participantJid: jid
    };

    if (url) {
        try {
            const res = await fetch(`${url}/reactions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(reqBody)
            });

            if (!res.ok) {
                logger.error('Status error:', res.status);
            }
        } catch (err) {
            logger.error('Could not send request', err);
        }
    }
}

/**
 * Returns unique reactions from the reactions buffer.
 *
 * @param {Array} reactions - The reactions buffer.
 */
function getUniqueReactions(reactions: Array<string>): Array<string> {
    return [ ...new Set(reactions) ];
}

/**
 * Returns frequency of given reaction in array.
 *
 * @param {Array} reactions - Array of reactions.
 * @param {string} reaction - Reaction to get frequency for.
 */
function getReactionFrequency(reactions: Array<string>, reaction: string): number {
    return reactions.filter(r => r === reaction).length;
}

/**
 * Returns the threshold number for a given frequency.
 *
 * @param {number} frequency - Frequency of reaction.
 */
function getSoundThresholdByFrequency(frequency: number): number {
    for (const i of SOUNDS_THRESHOLDS) {
        if (frequency <= i) {
            return i;
        }
    }

    return SOUNDS_THRESHOLDS[SOUNDS_THRESHOLDS.length - 1];
}

/**
 * Returns unique reactions with threshold.
 *
 * @param {Array} reactions - The reactions buffer.
 */
export function getReactionsSoundsThresholds(reactions: Array<string>): Array<ReactionThreshold> {
    const unique = getUniqueReactions(reactions);

    return unique.map<ReactionThreshold>(reaction => {
        return {
            reaction,
            threshold: getSoundThresholdByFrequency(getReactionFrequency(reactions, reaction))
        };
    });
}

/**
 * Whether or not the reactions are enabled.
 *
 * @param {Object} state - The Redux state object.
 */
export function isReactionsEnabled(state: any): boolean {
    const { disableReactions } = state['features/base/config'];

    if (navigator.product === 'ReactNative') {
        return !disableReactions && getFeatureFlag(state, REACTIONS_ENABLED, true);
    }

    return !disableReactions;
}
