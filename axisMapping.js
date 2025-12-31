/**
 * Axis Mapping Configuration Module
 * 
 * Provides configurable axis mappings for speed and coefficient charts.
 * Allows dynamic swapping of which values map to which axes and whether they're reversed.
 * 
 * NOTE: "reversed" means reversed from standard canvas coordinates where:
 * - Positive X goes RIGHT
 * - Positive Y goes DOWN
 * 
 * So reversed:true means the sign is flipped (use -1 multiplier)
 */

// Preset configurations
export const AXIS_PRESETS = {
    // Default: Current configuration
    // Speed: X=VXS (right+), Y=VYS (down+ in canvas = normal canvas coords)
    // Coeff: X=CD (left+ = reversed), Y=CL (up+ = reversed from canvas down)
    default: {
        name: 'Default (Standard)',
        description: 'VXS→X, VYS→Y | CD→X(rev), CL→Y(rev)',
        speedChart: {
            xAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' },
            yAxis: { value: 'vys', reversed: false, label: 'VYS', description: 'vertical speed' }
        },
        coeffChart: {
            xAxis: { value: 'cd', reversed: true, label: 'CD', description: 'drag coefficient' },
            yAxis: { value: 'cl', reversed: true, label: 'CL', description: 'lift coefficient' }
        }
    },
    
    // Speed axes swapped
    speedSwapped: {
        name: 'Speed Axes Swapped',
        description: 'VYS→X, VXS→Y | CD→X(rev), CL→Y(rev)',
        speedChart: {
            xAxis: { value: 'vys', reversed: false, label: 'VYS', description: 'vertical speed' },
            yAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' }
        },
        coeffChart: {
            xAxis: { value: 'cd', reversed: true, label: 'CD', description: 'drag coefficient' },
            yAxis: { value: 'cl', reversed: true, label: 'CL', description: 'lift coefficient' }
        }
    },
    
    // Coefficient axes swapped
    coeffSwapped: {
        name: 'Coefficient Axes Swapped',
        description: 'VXS→X, VYS→Y | CL→X(rev), CD→Y(rev)',
        speedChart: {
            xAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' },
            yAxis: { value: 'vys', reversed: false, label: 'VYS', description: 'vertical speed' }
        },
        coeffChart: {
            xAxis: { value: 'cl', reversed: true, label: 'CL', description: 'lift coefficient' },
            yAxis: { value: 'cd', reversed: true, label: 'CD', description: 'drag coefficient' }
        }
    },
    
    // Both axes swapped
    bothSwapped: {
        name: 'Both Axes Swapped',
        description: 'VYS→X, VXS→Y | CL→X(rev), CD→Y(rev)',
        speedChart: {
            xAxis: { value: 'vys', reversed: false, label: 'VYS', description: 'vertical speed' },
            yAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' }
        },
        coeffChart: {
            xAxis: { value: 'cl', reversed: true, label: 'CL', description: 'lift coefficient' },
            yAxis: { value: 'cd', reversed: true, label: 'CD', description: 'drag coefficient' }
        }
    },
    
    // Standard orientation (no reversals)
    standard: {
        name: 'Standard Orientation',
        description: 'VXS→X, VYS→Y | CD→X, CL→Y (no reversals)',
        speedChart: {
            xAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' },
            yAxis: { value: 'vys', reversed: false, label: 'VYS', description: 'vertical speed' }
        },
        coeffChart: {
            xAxis: { value: 'cd', reversed: false, label: 'CD', description: 'drag coefficient' },
            yAxis: { value: 'cl', reversed: false, label: 'CL', description: 'lift coefficient' }
        }
    },
    
    // Polar style (traditional aerodynamic polar)
    polar: {
        name: 'Polar Style',
        description: 'VXS→X, VYS→Y(rev) | CD→X, CL→Y(rev)',
        speedChart: {
            xAxis: { value: 'vxs', reversed: false, label: 'VXS', description: 'horizontal speed' },
            yAxis: { value: 'vys', reversed: true, label: 'VYS', description: 'vertical speed' }
        },
        coeffChart: {
            xAxis: { value: 'cd', reversed: false, label: 'CD', description: 'drag coefficient' },
            yAxis: { value: 'cl', reversed: true, label: 'CL', description: 'lift coefficient' }
        }
    }
};

/**
 * AxisMapping class - manages axis configuration for the chart
 */
export class AxisMapping {
    constructor(presetName = 'default') {
        this.setPreset(presetName);
    }
    
    /**
     * Set configuration from a preset name
     */
    setPreset(presetName) {
        const preset = AXIS_PRESETS[presetName];
        if (!preset) {
            console.warn(`Unknown preset: ${presetName}, using default`);
            this.config = { ...AXIS_PRESETS.default };
            this.currentPreset = 'default';
        } else {
            this.config = { ...preset };
            this.currentPreset = presetName;
        }
    }
    
    /**
     * Get the current preset name
     */
    getPresetName() {
        return this.currentPreset;
    }
    
    /**
     * Get the full configuration
     */
    getConfig() {
        return this.config;
    }
    
    // ========== Speed Chart Methods ==========
    
    /**
     * Get speed value for a given axis
     * @param {Object} point - Speed point with vxs, vys properties
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {number} The speed value for that axis
     */
    getSpeedValue(point, axis) {
        const valueName = this.config.speedChart[axis].value;
        return point[valueName];
    }
    
    /**
     * Get sign multiplier for speed axis (for coordinate calculation)
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {number} 1 or -1
     */
    getSpeedSign(axis) {
        return this.config.speedChart[axis].reversed ? -1 : 1;
    }
    
    /**
     * Get label for speed axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {string} Label like 'VXS' or 'VYS'
     */
    getSpeedLabel(axis) {
        return this.config.speedChart[axis].label;
    }
    
    /**
     * Get description for speed axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {string} Description like 'horizontal speed'
     */
    getSpeedDescription(axis) {
        return this.config.speedChart[axis].description;
    }
    
    /**
     * Check if speed axis is reversed
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {boolean}
     */
    isSpeedReversed(axis) {
        return this.config.speedChart[axis].reversed;
    }
    
    /**
     * Get the value name (property key) for speed axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {string} 'vxs' or 'vys'
     */
    getSpeedValueName(axis) {
        return this.config.speedChart[axis].value;
    }
    
    // ========== Coefficient Chart Methods ==========
    
    /**
     * Get coefficient value for a given axis
     * @param {Object} point - Coeff point with cd, cl (or kd, kl) properties
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @param {string} coeffType - 'c' or 'k' for C-coefficients or K-coefficients
     * @returns {number} The coefficient value for that axis
     */
    getCoeffValue(point, axis, coeffType = 'c') {
        const baseValue = this.config.coeffChart[axis].value; // 'cd' or 'cl'
        // Convert to actual property name based on coeffType
        // 'cd' -> coeffType + 'd' = 'cd' or 'kd'
        // 'cl' -> coeffType + 'l' = 'cl' or 'kl'
        const suffix = baseValue.slice(1); // 'd' or 'l'
        const valueName = coeffType + suffix;
        return point[valueName];
    }
    
    /**
     * Get sign multiplier for coefficient axis (for coordinate calculation)
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {number} 1 or -1
     */
    getCoeffSign(axis) {
        return this.config.coeffChart[axis].reversed ? -1 : 1;
    }
    
    /**
     * Get label for coefficient axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @param {string} coeffType - 'c' or 'k' for C-coefficients or K-coefficients
     * @returns {string} Label like 'CD', 'CL', 'KD', 'KL'
     */
    getCoeffLabel(axis, coeffType = 'c') {
        const baseLabel = this.config.coeffChart[axis].label; // 'CD' or 'CL'
        if (coeffType === 'k') {
            return 'K' + baseLabel.slice(1); // 'CD' -> 'KD', 'CL' -> 'KL'
        }
        return baseLabel;
    }
    
    /**
     * Get description for coefficient axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {string} Description like 'drag coefficient'
     */
    getCoeffDescription(axis) {
        return this.config.coeffChart[axis].description;
    }
    
    /**
     * Check if coefficient axis is reversed
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {boolean}
     */
    isCoeffReversed(axis) {
        return this.config.coeffChart[axis].reversed;
    }
    
    /**
     * Get the base value name (property key) for coefficient axis
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @returns {string} 'cd' or 'cl'
     */
    getCoeffValueName(axis) {
        return this.config.coeffChart[axis].value;
    }
    
    // ========== Coordinate Calculation Helpers ==========
    
    /**
     * Calculate X coordinate in speed space
     * @param {Object} speedPoint - Point with vxs, vys
     * @param {number} cx - Canvas center X
     * @param {number} halfWidth - Half canvas width
     * @param {number} range - Speed range (e.g., 150)
     * @returns {number} X coordinate
     */
    calcSpeedX(speedPoint, cx, halfWidth, range = 150) {
        const value = this.getSpeedValue(speedPoint, 'xAxis');
        const sign = this.getSpeedSign('xAxis');
        return cx + sign * (value / range) * halfWidth;
    }
    
    /**
     * Calculate Y coordinate in speed space
     * @param {Object} speedPoint - Point with vxs, vys
     * @param {number} cy - Canvas center Y
     * @param {number} halfHeight - Half canvas height
     * @param {number} range - Speed range (e.g., 150)
     * @returns {number} Y coordinate
     */
    calcSpeedY(speedPoint, cy, halfHeight, range = 150) {
        const value = this.getSpeedValue(speedPoint, 'yAxis');
        const sign = this.getSpeedSign('yAxis');
        return cy + sign * (value / range) * halfHeight;
    }
    
    /**
     * Calculate X coordinate in coefficient space
     * @param {Object} coeffPoint - Point with cd, cl (and kd, kl)
     * @param {number} cx - Canvas center X
     * @param {number} halfWidth - Half canvas width
     * @param {number} range - Coefficient range (e.g., 1 or 10)
     * @param {string} coeffType - 'c' or 'k'
     * @returns {number} X coordinate
     */
    calcCoeffX(coeffPoint, cx, halfWidth, range, coeffType = 'c') {
        const value = this.getCoeffValue(coeffPoint, 'xAxis', coeffType);
        const sign = this.getCoeffSign('xAxis');
        return cx + sign * (value / range) * halfWidth;
    }
    
    /**
     * Calculate Y coordinate in coefficient space
     * @param {Object} coeffPoint - Point with cd, cl (and kd, kl)
     * @param {number} cy - Canvas center Y
     * @param {number} halfHeight - Half canvas height
     * @param {number} range - Coefficient range (e.g., 1 or 10)
     * @param {string} coeffType - 'c' or 'k'
     * @returns {number} Y coordinate
     */
    calcCoeffY(coeffPoint, cy, halfHeight, range, coeffType = 'c') {
        const value = this.getCoeffValue(coeffPoint, 'yAxis', coeffType);
        const sign = this.getCoeffSign('yAxis');
        return cy + sign * (value / range) * halfHeight;
    }
    
    // ========== Legend/Label Text Helpers ==========
    
    /**
     * Get full axis description for legend
     * @param {string} chartType - 'speed' or 'coeff'
     * @param {string} axis - 'xAxis' or 'yAxis'
     * @param {string} coeffType - 'c' or 'k' (only for coeff chart)
     * @returns {string} Full description like "VXS (horizontal speed, -150 to +150 mph)"
     */
    getAxisLegendText(chartType, axis, coeffType = 'c') {
        if (chartType === 'speed') {
            const label = this.getSpeedLabel(axis);
            const desc = this.getSpeedDescription(axis);
            const reversed = this.isSpeedReversed(axis);
            const direction = axis === 'xAxis' 
                ? (reversed ? '+150 LEFT to -150 RIGHT' : '-150 to +150 mph')
                : (reversed ? '+150 TOP to -150 BOTTOM' : '-150 to +150 mph');
            return `${label} (${desc}, ${direction})`;
        } else {
            const label = this.getCoeffLabel(axis, coeffType);
            const desc = this.getCoeffDescription(axis);
            const reversed = this.isCoeffReversed(axis);
            const direction = axis === 'xAxis'
                ? (reversed ? '+1 LEFT to -1 RIGHT' : '-1 to +1')
                : (reversed ? '+1 TOP to -1 BOTTOM' : '-1 to +1');
            return `${label} (${desc}, ${direction})`;
        }
    }
    
    /**
     * Generate grid line label
     * @param {string} chartType - 'speed' or 'coeff'
     * @param {string} lineType - 'horizontal' or 'vertical'
     * @param {number} value - The value for this grid line
     * @param {string} coeffType - 'c' or 'k' (only for coeff chart)
     * @returns {string} Label like "VYS=30" or "CL=0.5"
     */
    getGridLineLabel(chartType, lineType, value, coeffType = 'c') {
        // horizontal lines are constant Y-axis value
        // vertical lines are constant X-axis value
        const axis = lineType === 'horizontal' ? 'yAxis' : 'xAxis';
        
        if (chartType === 'speed') {
            const label = this.getSpeedLabel(axis);
            return `${label}=${value}`;
        } else {
            const label = this.getCoeffLabel(axis, coeffType);
            // Format based on magnitude
            if (Math.abs(value) >= 1) {
                return `${label}=${value.toFixed(0)}`;
            } else {
                return `${label}=${value.toFixed(1)}`;
            }
        }
    }
}

// Create and export a default instance
export const defaultAxisMapping = new AxisMapping('default');
