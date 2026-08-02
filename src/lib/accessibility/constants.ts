export const A11Y_STORAGE_KEY = 'aph-a11y-settings';

export type TextAlign = 'default' | 'left' | 'center' | 'right' | 'justify';

export type A11ySettings = {
  fontScale: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: TextAlign;
  highContrast: boolean;
  invertColors: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  largeCursor: boolean;
  readingGuide: boolean;
  readingMask: boolean;
  dyslexiaFont: boolean;
  pauseAnimations: boolean;
  reduceMotion: boolean;
  hideImages: boolean;
  readAloudRate: number;
  readAloudVolume: number;
  readAloudVoiceURI: string | null;
};

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  fontScale: 1,
  letterSpacing: 0,
  lineHeight: 0,
  textAlign: 'default',
  highContrast: false,
  invertColors: false,
  grayscale: false,
  underlineLinks: false,
  highlightLinks: false,
  highlightHeadings: false,
  largeCursor: false,
  readingGuide: false,
  readingMask: false,
  dyslexiaFont: false,
  pauseAnimations: false,
  reduceMotion: false,
  hideImages: false,
  readAloudRate: 1,
  readAloudVolume: 1,
  readAloudVoiceURI: null
};

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

export const LETTER_SPACING_MIN = 0;
export const LETTER_SPACING_MAX = 0.2;
export const LETTER_SPACING_STEP = 0.02;

export const LINE_HEIGHT_MIN = 0;
export const LINE_HEIGHT_MAX = 1;
export const LINE_HEIGHT_STEP = 0.1;

export const READ_RATE_MIN = 0.5;
export const READ_RATE_MAX = 2;
export const READ_RATE_STEP = 0.1;

export const READ_VOLUME_MIN = 0;
export const READ_VOLUME_MAX = 1;
export const READ_VOLUME_STEP = 0.1;
