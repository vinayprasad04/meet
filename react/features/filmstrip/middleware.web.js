// @flow

import { batch } from 'react-redux';

import VideoLayout from '../../../modules/UI/videolayout/VideoLayout';
import {
    DOMINANT_SPEAKER_CHANGED,
    getDominantSpeakerParticipant,
    getLocalParticipant,
    getLocalScreenShareParticipant,
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT
} from '../base/participants';
import { MiddlewareRegistry } from '../base/redux';
import { CLIENT_RESIZED } from '../base/responsive-ui';
import { SETTINGS_UPDATED } from '../base/settings';
import {
    getCurrentLayout,
    LAYOUTS,
    setTileView
} from '../video-layout';

import {
    ADD_STAGE_PARTICIPANT,
    CLEAR_STAGE_PARTICIPANTS,
    REMOVE_STAGE_PARTICIPANT,
    SET_MAX_STAGE_PARTICIPANTS,
    SET_USER_FILMSTRIP_WIDTH,
    TOGGLE_PIN_STAGE_PARTICIPANT
} from './actionTypes';
import {
    addStageParticipant,
    removeStageParticipant,
    setFilmstripWidth,
    setStageParticipants
} from './actions';
import {
    ACTIVE_PARTICIPANT_TIMEOUT,
    DEFAULT_FILMSTRIP_WIDTH,
    MAX_ACTIVE_PARTICIPANTS,
    MIN_STAGE_VIEW_WIDTH
} from './constants';
import {
    isFilmstripResizable,
    updateRemoteParticipants,
    updateRemoteParticipantsOnLeave,
    getActiveParticipantsIds,
    getPinnedActiveParticipants,
    isStageFilmstripAvailable
} from './functions';
import './subscriber';

/**
 * Map of timers.
 *
 * @type {Map}
 */
const timers = new Map();

/**
 * The middleware of the feature Filmstrip.
 */
MiddlewareRegistry.register(store => next => action => {
    if (action.type === PARTICIPANT_LEFT) {
        // This has to be executed before we remove the participant from features/base/participants state in order to
        // remove the related thumbnail component before we need to re-render it. If we do this after next()
        // we will be in sitation where the participant exists in the remoteParticipants array in features/filmstrip
        // but doesn't exist in features/base/participants state which will lead to rendering a thumbnail for
        // non-existing participant.
        updateRemoteParticipantsOnLeave(store, action.participant?.id);
    }

    let result;

    switch (action.type) {
    case CLIENT_RESIZED: {
        const state = store.getState();

        if (isFilmstripResizable(state)) {
            const { width: filmstripWidth } = state['features/filmstrip'];
            const { clientWidth } = action;
            let width;

            if (filmstripWidth.current > clientWidth - MIN_STAGE_VIEW_WIDTH) {
                width = Math.max(clientWidth - MIN_STAGE_VIEW_WIDTH, DEFAULT_FILMSTRIP_WIDTH);
            } else {
                width = Math.min(clientWidth - MIN_STAGE_VIEW_WIDTH, filmstripWidth.userSet);
            }

            if (width !== filmstripWidth.current) {
                store.dispatch(setFilmstripWidth(width));
            }
        }
        break;
    }
    case PARTICIPANT_JOINED: {
        result = next(action);
        if (action.participant?.isLocalScreenShare) {
            break;
        }

        updateRemoteParticipants(store, action.participant?.id);
        break;
    }
    case SETTINGS_UPDATED: {
        if (typeof action.settings?.localFlipX === 'boolean') {
            // TODO: This needs to be removed once the large video is Reactified.
            VideoLayout.onLocalFlipXChanged();
        }
        if (action.settings?.disableSelfView) {
            const state = store.getState();
            const local = getLocalParticipant(state);
            const localScreenShare = getLocalScreenShareParticipant(state);
            const activeParticipantsIds = getActiveParticipantsIds(state);

            if (activeParticipantsIds.find(id => id === local.id)) {
                store.dispatch(removeStageParticipant(local.id));
            }

            if (localScreenShare) {
                if (activeParticipantsIds.find(id => id === localScreenShare.id)) {
                    store.dispatch(removeStageParticipant(localScreenShare.id));
                }
            }
        }
        break;
    }
    case SET_USER_FILMSTRIP_WIDTH: {
        VideoLayout.refreshLayout();
        break;
    }
    case ADD_STAGE_PARTICIPANT: {
        const { dispatch, getState } = store;
        const { participantId, pinned } = action;
        const state = getState();
        const { activeParticipants, maxStageParticipants } = state['features/filmstrip'];
        let queue;

        if (activeParticipants.find(p => p.participantId === participantId)) {
            queue = activeParticipants.filter(p => p.participantId !== participantId);
            queue.push({
                participantId,
                pinned
            });
            const tid = timers.get(participantId);

            clearTimeout(tid);
            timers.delete(participantId);
        } else if (activeParticipants.length < maxStageParticipants) {
            queue = [ ...activeParticipants, {
                participantId,
                pinned
            } ];
        } else {
            const notPinnedIndex = activeParticipants.findIndex(p => !p.pinned);

            if (notPinnedIndex === -1) {
                if (pinned) {
                    queue = [ ...activeParticipants, {
                        participantId,
                        pinned
                    } ];
                    queue.shift();
                }
            } else {
                queue = [ ...activeParticipants, {
                    participantId,
                    pinned
                } ];
                queue.splice(notPinnedIndex, 1);
            }
        }

        // If queue is undefined we haven't made any changes to the active participants. This will mostly happen
        // if the participant that we are trying to add is not pinned and all slots are currently taken by pinned
        // participants.
        // IMPORTANT: setting active participants to undefined will crash jitsi-meet.
        if (typeof queue !== 'undefined') {
            dispatch(setStageParticipants(queue));
            if (!pinned) {
                const timeoutId = setTimeout(() => dispatch(removeStageParticipant(participantId)),
                    ACTIVE_PARTICIPANT_TIMEOUT);

                timers.set(participantId, timeoutId);
            }
        }

        if (getCurrentLayout(state) === LAYOUTS.TILE_VIEW) {
            dispatch(setTileView(false));
        }
        break;
    }
    case REMOVE_STAGE_PARTICIPANT: {
        const state = store.getState();
        const { participantId } = action;
        const tid = timers.get(participantId);

        clearTimeout(tid);
        timers.delete(participantId);
        const dominant = getDominantSpeakerParticipant(state);

        if (participantId === dominant?.id) {
            const timeoutId = setTimeout(() => store.dispatch(removeStageParticipant(participantId)),
                ACTIVE_PARTICIPANT_TIMEOUT);

            timers.set(participantId, timeoutId);

            return;
        }
        break;
    }
    case DOMINANT_SPEAKER_CHANGED: {
        const { id } = action.participant;
        const state = store.getState();
        const stageFilmstrip = isStageFilmstripAvailable(state);
        const local = getLocalParticipant(state);
        const currentLayout = getCurrentLayout(state);

        if (id === local.id || currentLayout === LAYOUTS.TILE_VIEW) {
            break;
        }

        if (stageFilmstrip) {
            const isPinned = getPinnedActiveParticipants(state).some(p => p.participantId === id);

            store.dispatch(addStageParticipant(id, Boolean(isPinned)));
        }
        break;
    }
    case PARTICIPANT_LEFT: {
        const state = store.getState();
        const { id } = action.participant;
        const activeParticipantsIds = getActiveParticipantsIds(state);

        if (activeParticipantsIds.find(pId => pId === id)) {
            const tid = timers.get(id);
            const { activeParticipants } = state['features/filmstrip'];

            clearTimeout(tid);
            timers.delete(id);
            store.dispatch(setStageParticipants(activeParticipants.filter(p => p.participantId !== id)));
        }
        break;
    }
    case SET_MAX_STAGE_PARTICIPANTS: {
        const { maxParticipants } = action;
        const { activeParticipants } = store.getState()['features/filmstrip'];
        const newMax = Math.min(MAX_ACTIVE_PARTICIPANTS, maxParticipants);

        action.maxParticipants = newMax;

        if (newMax < activeParticipants.length) {
            const toRemove = activeParticipants.slice(0, activeParticipants.length - newMax);

            batch(() => {
                toRemove.forEach(p => store.dispatch(removeStageParticipant(p.participantId)));
            });
        }
        break;
    }
    case TOGGLE_PIN_STAGE_PARTICIPANT: {
        const { dispatch, getState } = store;
        const state = getState();
        const { participantId } = action;
        const pinnedParticipants = getPinnedActiveParticipants(state);
        const dominant = getDominantSpeakerParticipant(state);

        if (pinnedParticipants.find(p => p.participantId === participantId)) {
            if (dominant?.id === participantId) {
                const { activeParticipants } = state['features/filmstrip'];
                const queue = activeParticipants.map(p => {
                    if (p.participantId === participantId) {
                        return {
                            participantId,
                            pinned: false
                        };
                    }

                    return p;
                });

                dispatch(setStageParticipants(queue));
            } else {
                dispatch(removeStageParticipant(participantId));
            }
        } else {
            dispatch(addStageParticipant(participantId, true));
        }
        break;
    }
    case CLEAR_STAGE_PARTICIPANTS: {
        const activeParticipants = getActiveParticipantsIds(store.getState());

        activeParticipants.forEach(pId => {
            const tid = timers.get(pId);

            clearTimeout(tid);
            timers.delete(pId);
        });
    }
    }

    return result ?? next(action);
});
