const SCALE = 1;
const CELLHOUR = 180 * SCALE;
const CELL_PROGRAM_HEIGHT = 90;
const HEADER_CELL_HEIGHT = 50;
const HOUR_DURATION = 60 * 60 * 1000;

const CHANNEL_PER_FETCH = 20;
const MIN_PROGRAM_DURATION = 10 * 60 * 1000; //min;

const guideThemes = {
    BG_HEADER: '#000000',
    BG_CELL: '#8b8b8b',
    BG_ACTIVE: '#9e140d',
    COLOR_TEXT: '#FFFFFF',
    BG_CHANNEL: '#000000',
    BG_PROGRAM: '#000000',
    TITLE_SIZE: 20,
}

export {
    SCALE,
    CELLHOUR,
    CELL_PROGRAM_HEIGHT,
    HEADER_CELL_HEIGHT,
    HOUR_DURATION,
    CHANNEL_PER_FETCH,
    guideThemes,
    MIN_PROGRAM_DURATION
}
