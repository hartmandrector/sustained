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
        return 0.5 * Math.pow(2, 20 * t - 10);
    }
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
}

