// Physical constants
export const GRAVITY = 9.8; // m/s²
const MPS_TO_MPH = 2.23694;
const MPH_TO_MPS = 1 / MPS_TO_MPH;

/**
 * Calculate k factor for coefficient conversions
 * k = 0.5 * ρ * S / m
 */
function calculateK(rho, s, m) {
    return 0.5 * rho * s / m;
}

/**
 * Convert coefficients (CL, CD) to sustained speeds (VXS, VYS)
 * @param {number} cl - Lift coefficient
 * @param {number} cd - Drag coefficient
 * @param {number} s - Wing area (m²)
 * @param {number} m - Mass (kg)
 * @param {number} rho - Air density (kg/m³)
 * @returns {Object} { vxs, vys } in m/s
 */
export function coeffToSS(cl, cd, s, m, rho) {
    const k = calculateK(rho, s, m);
    const kl = cl * k / GRAVITY;
    const kd = cd * k / GRAVITY;
    const denom = Math.pow(kl * kl + kd * kd, 0.75);
    
    // Handle zero case
    if (denom === 0) {
        return { vxs: 0, vys: 0 };
    }
    
    return { 
        vxs: kl / denom, 
        vys: kd / denom 
    };
}

/**
 * Convert sustained speeds (VXS, VYS) to coefficients (CL, CD)
 * @param {number} vxs - Horizontal sustained speed (m/s)
 * @param {number} vys - Vertical sustained speed (m/s)
 * @param {number} s - Wing area (m²)
 * @param {number} m - Mass (kg)
 * @param {number} rho - Air density (kg/m³)
 * @returns {Object} { cl, cd }
 */
export function ssToCoeff(vxs, vys, s, m, rho) {
    const k = calculateK(rho, s, m);
    const denom = Math.pow(vxs * vxs + vys * vys, 1.5);
    
    // Handle zero case
    if (denom === 0) {
        return { cl: 0, cd: 0 };
    }
    
    const kl = vxs / denom;
    const kd = vys / denom;
    
    return { 
        cl: kl / k * GRAVITY, 
        cd: kd / k * GRAVITY 
    };
}

/**
 * Convert m/s to mph
 */
export function mpsToMph(mps) {
    return mps * MPS_TO_MPH;
}

/**
 * Convert mph to m/s
 */
export function mphToMps(mph) {
    return mph * MPH_TO_MPS;
}
