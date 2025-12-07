/**
 * Shared easing curve for consistent motion across the application.
 * Uses a custom Bezier curve [0.4, 0, 0.2, 1] for a premium, smooth feel.
 */
export const EASING: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Standard fade-in animation variant.
 */
export const FADE_IN = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5, ease: EASING } }
};

/**
 * Standard slide-up animation variant.
 * Used for entering elements like cards and text blocks.
 */
export const SLIDE_UP = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASING } }
};
