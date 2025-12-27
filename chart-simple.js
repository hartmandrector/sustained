import { coeffToSS, ssToCoeff, mphToMps, mpsToMph } from './utilities.js';
import { easeInOutExpo } from './interpolation.js';

export class SimpleChart {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Default parameters
        this.s = 2.0;
        this.m = 70.0;
        this.rho = 1.0;
        
        // View state
        this.currentView = 'speed'; // 'speed' or 'coeff'
        this.coeffType = 'c'; // 'k' or 'c' - default to C coefficients
        this.showGrid = true;
        
        // Animation state
        this.isAnimating = false;
        this.animationProgress = 0; // 0 = speed view, 1 = coeff view
        
        // Generate and store all lines
        this.generateGrid();
        
        // Initial draw
        this.render();
    }
    
    switchCoordinateSystem() {
        if (this.isAnimating) {
            return;
        }
        
        const targetView = this.currentView === 'speed' ? 'coeff' : 'speed';
        this.animateTransition(targetView);
    }
    
    animateTransition(targetView) {
        this.isAnimating = true;
        
        const startProgress = this.animationProgress;
        const targetProgress = targetView === 'coeff' ? 1 : 0;
        const duration = 1500; // milliseconds
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const t = Math.min(elapsed / duration, 1.0);
            
            // Apply easing
            const easedT = easeInOutExpo(t);
            
            // Interpolate progress
            this.animationProgress = startProgress + (targetProgress - startProgress) * easedT;
            
            // Redraw
            this.render();
            
            if (t < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.isAnimating = false;
                this.currentView = targetView;
                this.animationProgress = targetProgress;
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.render();
    }
    
    reset() {
        if (this.isAnimating) return;
        
        this.currentView = 'speed';
        this.animationProgress = 0;
        this.showGrid = true;
        this.render();
    }
    
    /**
     * Convert coefficient point to K or C values based on coeffType
     */
    getCoeffValues(cp) {
        if (this.coeffType === 'k') {
            // Convert C to K: k = 0.5 * ρ * S / m, KL = CL * k / g, KD = CD * k / g
            const k = 0.5 * this.rho * this.s / this.m;
            const g = 9.8;
            return {
                cd: cp.cd * k / g,
                cl: cp.cl * k / g
            };
        }
        // Return C coefficients as-is
        return { cd: cp.cd, cl: cp.cl };
    }
    
    /**
     * Get axis range for current coefficient type
     */
    getCoeffRange() {
        if (this.coeffType === 'k') {
            // K coefficients have smaller range
            const k = 0.5 * this.rho * this.s / this.m;
            const g = 9.8;
            const scale = k / g;
            return scale; // Typical range is ±(1 * scale)
        }
        return 1; // C coefficients range is ±1
    }
    
    /**
     * Get label text for a line based on current coeffType
     */
    getLineLabel(line) {
        // For speed lines and glide lines, label doesn't change
        if (line.type === 'horizontal' || line.type === 'vertical' || line.type === 'glide') {
            return line.label;
        }
        
        // For coefficient lines, convert if in K mode
        if (line.type === 'coeff-horizontal') {
            // This is a CL line
            const value = line.labelValue;
            if (this.coeffType === 'k') {
                const k = 0.5 * this.rho * this.s / this.m;
                const g = 9.8;
                const kValue = value * k / g;
                // Choose between milli and micro for readability
                const milliValue = kValue * 1000;
                if (Math.abs(milliValue) < 0.1 && milliValue !== 0) {
                    const microValue = kValue * 1000000;
                    return `KL=${microValue.toFixed(1)}μ`;
                }
                return `KL=${milliValue.toFixed(2)}m`;
            }
            return `CL=${value.toFixed(1)}`;
        }
        
        if (line.type === 'coeff-vertical') {
            // This is a CD line
            const value = line.labelValue;
            if (this.coeffType === 'k') {
                const k = 0.5 * this.rho * this.s / this.m;
                const g = 9.8;
                const kValue = value * k / g;
                // Choose between milli and micro for readability
                const milliValue = kValue * 1000;
                if (Math.abs(milliValue) < 0.1 && milliValue !== 0) {
                    const microValue = kValue * 1000000;
                    return `KD=${microValue.toFixed(1)}μ`;
                }
                return `KD=${milliValue.toFixed(2)}m`;
            }
            return `CD=${value.toFixed(1)}`;
        }
        
        return line.label;
    }
    
    generateGrid() {
        this.allLines = [];
        
        // Horizontal lines (constant VYS)
        for (let vys = -150; vys <= 150; vys += 30) {
            const speedPoints = [];
            const coeffPoints = [];
            
            for (let vxs = -150; vxs <= 150; vxs += 5) {
                speedPoints.push({ vxs, vys });
                
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints.push({ cl, cd });
            }
            
            this.allLines.push({ 
                speedPoints, 
                coeffPoints, 
                color: '#e74c3c', 
                type: 'horizontal',
                label: `VYS=${vys}`,
                labelValue: vys
            });
        }
        
        // Vertical lines (constant VXS)
        for (let vxs = -150; vxs <= 150; vxs += 30) {
            const speedPoints = [];
            const coeffPoints = [];
            
            for (let vys = -150; vys <= 150; vys += 5) {
                speedPoints.push({ vxs, vys });
                
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints.push({ cl, cd });
            }
            
            this.allLines.push({ 
                speedPoints, 
                coeffPoints, 
                color: '#3498db', 
                type: 'vertical',
                label: `VXS=${vxs}`,
                labelValue: vxs
            });
        }
        
        // Coefficient horizontal lines (constant CL)
        for (let cl = -1.0; cl <= 1.0; cl += 0.2) {
            const speedPoints = [];
            const coeffPoints = [];
            
            for (let cd = -1.0; cd <= 1.0; cd += 0.05) {
                coeffPoints.push({ cl, cd });
                
                // Convert from coefficient space to speed space
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: '#9b59b6', // Purple for CL lines
                type: 'coeff-horizontal',
                label: `CL=${cl.toFixed(1)}`,
                labelValue: cl
            });
        }
        
        // Coefficient vertical lines (constant CD)
        for (let cd = -1.0; cd <= 1.0; cd += 0.2) {
            const speedPoints = [];
            const coeffPoints = [];
            
            for (let cl = -1.0; cl <= 1.0; cl += 0.05) {
                coeffPoints.push({ cl, cd });
                
                // Convert from coefficient space to speed space
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: '#27ae60', // Green for CD lines
                type: 'coeff-vertical',
                label: `CD=${cd.toFixed(1)}`,
                labelValue: cd
            });
        }
        
        // Glide ratio lines (through origin in speed space)
        const glideRatios = [
            { ratio: 1, color: '#e74c3c', label: '1:1 glide' },  // Red
            { ratio: 2, color: '#f39c12', label: '2:1 glide' },  // Orange/Yellow
            { ratio: 3, color: '#27ae60', label: '3:1 glide' }   // Green
        ];
        
        glideRatios.forEach(({ ratio, color, label }) => {
            const speedPoints = [];
            const coeffPoints = [];
            
            // Glide line: VXS / |VYS| = ratio
            // So VYS = -VXS/ratio (negative because descent is positive VYS)
            // Draw from VXS = -150 to VXS = +150
            for (let vxs = -150; vxs <= 150; vxs += 5) {
                const vys = -vxs / ratio; // Negative sign: positive VYS is descent
                speedPoints.push({ vxs, vys });
                
                // Convert to coefficient space
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints.push({ cl, cd });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: color,
                type: 'glide',
                label: label,
                labelValue: ratio
            });
        });
    }
    
    render() {
        this.draw();
    }
    
    draw() {
        // Clear
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Draw axes
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, cy);
        this.ctx.lineTo(this.canvas.width, cy);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(cx, 0);
        this.ctx.lineTo(cx, this.canvas.height);
        this.ctx.stroke();
        
        if (!this.showGrid) {
            this.drawLabels();
            return;
        }
        
        // Draw grid with interpolation and collect label positions
        const labelPositions = [];
        
        this.allLines.forEach(line => {
            const { speedPoints, coeffPoints, color, type } = line;
            const label = this.getLineLabel(line);
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            
            let started = false;
            let labelX, labelY;
            const numPoints = Math.min(speedPoints.length, coeffPoints.length);
            
            // Determine label position to avoid overlaps
            // Speed lines (VXS/VYS): use 1/3 point
            // Coeff lines (CL/CD): use 2/3 point
            let labelFraction;
            if (type === 'horizontal' || type === 'vertical') {
                labelFraction = 0.33; // Speed lines at 1/3
            } else {
                labelFraction = 0.67; // Coefficient lines at 2/3
            }
            const labelIndex = Math.floor(numPoints * labelFraction);
            
            for (let i = 0; i < numPoints; i++) {
                const sp = speedPoints[i];
                const cp = coeffPoints[i];
                
                // Calculate speed space position (VXS and VYS both -150 to +150)
                // Speed view: flip Y-axis so negative VYS is at top, positive at bottom
                const x1 = cx + (sp.vxs / 150) * (this.canvas.width / 2);
                const y1 = cy + (sp.vys / 150) * (this.canvas.height / 2);
                
                // Calculate coeff space position
                // Get effective coefficient values (K or C based on coeffType)
                const coeff = this.getCoeffValues(cp);
                const range = this.getCoeffRange();
                // Coeff view: flip X-axis so positive CD (drag) is on the left
                const x2 = cx - (coeff.cd / range) * (this.canvas.width / 2);
                const y2 = cy - (coeff.cl / range) * (this.canvas.height / 2);
                
                // Interpolate between the two
                const x = x1 + (x2 - x1) * this.animationProgress;
                const y = y1 + (y2 - y1) * this.animationProgress;
                
                // Only draw if point is within reasonable bounds (with margin for curves)
                const margin = this.canvas.width * 0.5; // 50% margin
                const inBounds = x > -margin && x < this.canvas.width + margin &&
                                 y > -margin && y < this.canvas.height + margin;
                
                if (isFinite(x) && isFinite(y) && inBounds) {
                    if (!started) {
                        this.ctx.moveTo(x, y);
                        started = true;
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                    
                    // Capture label position with perpendicular offset
                    if (i === labelIndex) {
                        let offsetX = 0;
                        let offsetY = 0;
                        
                        // Calculate perpendicular offset based on line direction
                        if (i > 0 && i < numPoints - 1) {
                            const sp_prev = speedPoints[Math.max(0, i - 3)];
                            const cp_prev = coeffPoints[Math.max(0, i - 3)];
                            const x1_prev = cx + (sp_prev.vxs / 150) * (this.canvas.width / 2);
                            const y1_prev = cy + (sp_prev.vys / 150) * (this.canvas.height / 2);
                            const coeff_prev = this.getCoeffValues(cp_prev);
                            const x2_prev = cx - (coeff_prev.cd / range) * (this.canvas.width / 2);
                            const y2_prev = cy - (coeff_prev.cl / range) * (this.canvas.height / 2);
                            const x_prev = x1_prev + (x2_prev - x1_prev) * this.animationProgress;
                            const y_prev = y1_prev + (y2_prev - y1_prev) * this.animationProgress;
                            
                            const sp_next = speedPoints[Math.min(numPoints - 1, i + 3)];
                            const cp_next = coeffPoints[Math.min(numPoints - 1, i + 3)];
                            const x1_next = cx + (sp_next.vxs / 150) * (this.canvas.width / 2);
                            const y1_next = cy + (sp_next.vys / 150) * (this.canvas.height / 2);
                            const coeff_next = this.getCoeffValues(cp_next);
                            const x2_next = cx - (coeff_next.cd / range) * (this.canvas.width / 2);
                            const y2_next = cy - (coeff_next.cl / range) * (this.canvas.height / 2);
                            const x_next = x1_next + (x2_next - x1_next) * this.animationProgress;
                            const y_next = y1_next + (y2_next - y1_next) * this.animationProgress;
                            
                            // Tangent vector
                            const dx = x_next - x_prev;
                            const dy = y_next - y_prev;
                            const len = Math.sqrt(dx * dx + dy * dy);
                            
                            if (len > 0) {
                                // Perpendicular vector (rotated 90 degrees)
                                const perpX = -dy / len;
                                const perpY = dx / len;
                                
                                // Speed lines offset one way, coeff lines the other
                                const offsetDist = (type === 'horizontal' || type === 'vertical') ? 15 : -15;
                                offsetX = perpX * offsetDist;
                                offsetY = perpY * offsetDist;
                            }
                        }
                        
                        labelX = x + offsetX;
                        labelY = y + offsetY;
                    }
                } else if (started) {
                    // Point is out of bounds, break the line
                    started = false;
                }
            }
            
            this.ctx.stroke();
            
            // Store label position
            if (labelX !== undefined && labelY !== undefined) {
                labelPositions.push({ x: labelX, y: labelY, label, color, type });
            }
        });
        
        // Draw all labels after lines
        this.ctx.globalAlpha = 1.0;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        labelPositions.forEach(({ x, y, label, color, type }) => {
            // Draw background for readability
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const metrics = this.ctx.measureText(label);
            const padding = 4;
            this.ctx.fillRect(
                x - metrics.width / 2 - padding,
                y - 8,
                metrics.width + padding * 2,
                16
            );
            
            // Draw text
            this.ctx.fillStyle = color;
            this.ctx.fillText(label, x, y);
        });
        
        this.ctx.globalAlpha = 1.0;
        
        this.drawLabels();
    }
    
    drawLabels() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 14px Arial';
        
        // View label logic: 
        // animationProgress = 0 means speed grid is straight (Speed View)
        // animationProgress = 1 means coeff grid is straight (Coefficient View)
        if (this.animationProgress > 0.5) {
            // Coefficient space labels (coeff grid is straight/rectangular)
            this.ctx.fillText('COEFFICIENT VIEW', 150, 25);
            this.ctx.font = '12px Arial';
            const xLabel = this.coeffType === 'k' ? 'KD' : 'CD';
            const yLabel = this.coeffType === 'k' ? 'KL' : 'CL';
            this.ctx.fillText(`X-axis: ${xLabel} (drag coefficient, -1 LEFT to +1 RIGHT)`, 150, 45);
            this.ctx.fillText(`Y-axis: ${yLabel} (lift coefficient, -1 to +1)`, 150, 65);
            this.ctx.fillText('Speed grid lines are curved in this view', 150, 85);
        } else {
            // Speed space labels (speed grid is straight/rectangular)
            this.ctx.fillText('SPEED VIEW', 150, 25);
            this.ctx.font = '12px Arial';
            this.ctx.fillText('X-axis: VXS (horizontal speed, -150 to +150 mph)', 150, 45);
            this.ctx.fillText('Y-axis: VYS (vertical speed, -150 to +150 mph)', 150, 65);
            this.ctx.fillText('Red = constant VYS | Blue = constant VXS', 150, 85);
        }
    }
}
