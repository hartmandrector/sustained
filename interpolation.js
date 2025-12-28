/**
 * Easing functions for smooth animations
 */

/**
 * Exponential ease-in-out
 * Smooth acceleration and deceleration
 */
export function easeInOutExpo(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
        return 0.5 * Math.pow(2, 30 * t - 15);
    }
    return 1 - 0.5 * Math.pow(2, -30 * t + 15);
}

/**
 * Inverse ease-in-out for zoom
 * Fast at start and end, slow in the middle
 */
export function easeZoom(t) {
    // Use inverse of ease-in-out: fast at extremes, slow in middle
    // This is like an "ease-out-in"
    if (t < 0.5) {
        // First half: ease out (fast to slow)
        return 0.5 * (1 - Math.pow(2, -20 * t));
    } else {
        // Second half: ease in (slow to fast)
        return 0.5 + 0.5 * Math.pow(2, 20 * (t - 1));
    }
}

