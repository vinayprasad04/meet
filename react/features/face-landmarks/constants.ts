export const FACE_EXPRESSIONS_EMOJIS = {
    happy: '😊',
    neutral: '😐',
    sad: '🙁',
    surprised: '😮',
    angry: '😠',
    fearful: '😨'

    // disgusted: '🤢'
};

export const FACE_EXPRESSIONS = [ 'happy', 'neutral', 'sad', 'surprised', 'angry', 'fearful' ];

export const FACE_EXPRESSIONS_NAMING_MAPPING = {
    happy: 'happy',
    neutral: 'neutral',
    surprise: 'surprised',
    angry: 'angry',
    fear: 'fearful',
    disgust: 'disgusted',
    sad: 'sad'
};

/**
 * Time is ms used for sending expression.
 */
export const WEBHOOK_SEND_TIME_INTERVAL = 15000;

/**
 * Type of message sent from main thread to worker that contains init information:
 * such as models directory and window screen size.
 */
export const INIT_WORKER = 'INIT_WORKER';

/**
 * Type of event sent on the data channel.
 */
export const FACE_BOX_EVENT_TYPE = 'face-box';

/**
 * Miliseconds interval value for sending new image data to the worker.
 */
export const SEND_IMAGE_INTERVAL_MS = 1000;

/**
 * Type of message sent from main thread to worker that contain image data and
 * will trigger a response message from the worker containing the detected face(s) info.
 */
export const DETECT_FACE = 'DETECT_FACE';

/**
 * Available detection types.
 */
export const DETECTION_TYPES = {
    FACE_BOX: 'face-box',
    FACE_EXPRESSIONS: 'face-expressions'
};

/**
 * Threshold for detection score of face.
 */
export const FACE_DETECTION_SCORE_THRESHOLD = 0.6;