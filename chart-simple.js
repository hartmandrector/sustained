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
        
        // Dataset manager reference (will be set from app.js)
        this.datasetManager = null;
        
        // Customization options
        this.colors = {
            lift: '#9b59b6',
            drag: '#27ae60',
            horizontal: '#3498db',
            vertical: '#e74c3c',
            glide1: '#e74c3c',
            glide2: '#f39c12',
            glide3: '#27ae60',
            background: '#ffffff',
            legend: '#000000'
        };
        
        this.visibility = {
            showLift: true,
            showDrag: true,
            showHorizontal: true,
            showVertical: true,
            showGlide: true,
            showInnerCoeffLabels: true,
            showOuterCoeffLabels: true,
            showSpeedLabels: true,
            showGlideLabels: true
        };
        
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
        const duration = 6000; // milliseconds
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
    
    updateColors(colorUpdates) {
        Object.assign(this.colors, colorUpdates);
        this.generateGrid();
        this.render();
    }
    
    updateVisibility(visibilityUpdates) {
        Object.assign(this.visibility, visibilityUpdates);
        this.render();
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
                color: this.colors.vertical, 
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
                color: this.colors.horizontal, 
                type: 'vertical',
                label: `VXS=${vxs}`,
                labelValue: vxs
            });
        }
        
        // Coefficient horizontal lines (constant CL)
        for (let cl = -1.0; cl <= 1.0; cl += 0.2) {
            // Main segment: CD from -1 to 1
            let speedPoints = [];
            let coeffPoints = [];
            
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
                color: this.colors.lift, // Purple for CL lines
                type: 'coeff-horizontal',
                label: `CL=${cl.toFixed(1)}`,
                labelValue: cl
            });
            
            // Extended segments: CD from 0.95 to 10 (if cl != 0)
            if (cl !== 0) {
                speedPoints = [];
                coeffPoints = [];
                
                for (let cd = 0.95; cd <= 10; cd += 0.1) {
                    coeffPoints.push({ cl, cd });
                    
                    const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                    const vxs = mpsToMph(vxsMps);
                    const vys = mpsToMph(vysMps);
                    speedPoints.push({ vxs, vys });
                }
                
                this.allLines.push({
                    speedPoints,
                    coeffPoints,
                    color: this.colors.lift,
                    type: 'coeff-horizontal',
                    label: `CL=${cl.toFixed(1)}`,
                    labelValue: cl
                });
                
                // Extended segments: CD from -10 to -0.95
                speedPoints = [];
                coeffPoints = [];
                
                for (let cd = -10; cd <= -0.95; cd += 0.1) {
                    coeffPoints.push({ cl, cd });
                    
                    const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                    const vxs = mpsToMph(vxsMps);
                    const vys = mpsToMph(vysMps);
                    speedPoints.push({ vxs, vys });
                }
                
                this.allLines.push({
                    speedPoints,
                    coeffPoints,
                    color: this.colors.lift,
                    type: 'coeff-horizontal',
                    label: `CL=${cl.toFixed(1)}`,
                    labelValue: cl
                });
            }
        }
        
        // Coefficient vertical lines (constant CD)
        for (let cd = -1.0; cd <= 1.0; cd += 0.2) {
            // Main segment: CL from -1 to 1
            let speedPoints = [];
            let coeffPoints = [];
            
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
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${cd.toFixed(1)}`,
                labelValue: cd
            });
            
            // Extended segments: CL from 0.95 to 10 (if cd != 0)
            if (cd !== 0) {
                speedPoints = [];
                coeffPoints = [];
                
                for (let cl = 0.95; cl <= 10; cl += 0.1) {
                    coeffPoints.push({ cl, cd });
                    
                    const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                    const vxs = mpsToMph(vxsMps);
                    const vys = mpsToMph(vysMps);
                    speedPoints.push({ vxs, vys });
                }
                
                this.allLines.push({
                    speedPoints,
                    coeffPoints,
                    color: this.colors.drag,
                    type: 'coeff-vertical',
                    label: `CD=${cd.toFixed(1)}`,
                    labelValue: cd
                });
                
                // Extended segments: CL from -10 to -0.95
                speedPoints = [];
                coeffPoints = [];
                
                for (let cl = -10; cl <= -0.95; cl += 0.1) {
                    coeffPoints.push({ cl, cd });
                    
                    const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                    const vxs = mpsToMph(vxsMps);
                    const vys = mpsToMph(vysMps);
                    speedPoints.push({ vxs, vys });
                }
                
                this.allLines.push({
                    speedPoints,
                    coeffPoints,
                    color: this.colors.drag,
                    type: 'coeff-vertical',
                    label: `CD=${cd.toFixed(1)}`,
                    labelValue: cd
                });
            }
        }
        
        // Inner grid for canopy flight - extended coefficient range
        // Coefficient horizontal lines (constant CL) from 1 to 10
        for (let cl = 1; cl <= 10; cl += 1) {
            // Quadrant 1: Positive CL, positive CD
            let speedPoints = [];
            let coeffPoints = [];
            
            for (let cd = 1; cd <= 10; cd += 0.1) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${cl.toFixed(0)}`,
                labelValue: cl
            });
            
            // Quadrant 2: Positive CL, negative CD
            speedPoints = [];
            coeffPoints = [];
            
            for (let cd = -10; cd <= -1; cd += 0.1) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${cl.toFixed(0)}`,
                labelValue: cl
            });
            
            // Quadrant 3: Negative CL, negative CD
            speedPoints = [];
            coeffPoints = [];
            
            for (let cd = -10; cd <= -1; cd += 0.1) {
                coeffPoints.push({ cl: -cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(-cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${(-cl).toFixed(0)}`,
                labelValue: -cl
            });
            
            // Quadrant 4: Negative CL, positive CD
            speedPoints = [];
            coeffPoints = [];
            
            for (let cd = 1; cd <= 10; cd += 0.1) {
                coeffPoints.push({ cl: -cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(-cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${(-cl).toFixed(0)}`,
                labelValue: -cl
            });
        }
        
        // Coefficient vertical lines (constant CD) from 1 to 10
        for (let cd = 1; cd <= 10; cd += 1) {
            // Quadrant 1: Positive CD, positive CL
            let speedPoints = [];
            let coeffPoints = [];
            
            for (let cl = 1; cl <= 10; cl += 0.1) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${cd.toFixed(0)}`,
                labelValue: cd
            });
            
            // Quadrant 2: Positive CD, negative CL
            speedPoints = [];
            coeffPoints = [];
            
            for (let cl = -10; cl <= -1; cl += 0.1) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${cd.toFixed(0)}`,
                labelValue: cd
            });
            
            // Quadrant 3: Negative CD, negative CL
            speedPoints = [];
            coeffPoints = [];
            
            for (let cl = -10; cl <= -1; cl += 0.1) {
                coeffPoints.push({ cl, cd: -cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, -cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${(-cd).toFixed(0)}`,
                labelValue: -cd
            });
            
            // Quadrant 4: Negative CD, positive CL
            speedPoints = [];
            coeffPoints = [];
            
            for (let cl = 1; cl <= 10; cl += 0.1) {
                coeffPoints.push({ cl, cd: -cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, -cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${(-cd).toFixed(0)}`,
                labelValue: -cd
            });
        }
        
        // Fill in the connecting segments for inner grid lines
        // These connect the inner grid through the -1 to 1 region
        
        // For CL lines from 1-10, add segments where CD goes from -1 to 1
        for (let cl = 1; cl <= 10; cl += 1) {
            // Positive CL, CD from -1 to 1
            let speedPoints = [];
            let coeffPoints = [];
            
            for (let cd = -1; cd <= 1; cd += 0.05) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${cl.toFixed(0)}`,
                labelValue: cl
            });
            
            // Negative CL, CD from -1 to 1
            speedPoints = [];
            coeffPoints = [];
            
            for (let cd = -1; cd <= 1; cd += 0.05) {
                coeffPoints.push({ cl: -cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(-cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.lift,
                type: 'coeff-horizontal',
                label: `CL=${(-cl).toFixed(0)}`,
                labelValue: -cl
            });
        }
        
        // For CD lines from 1-10, add segments where CL goes from -1 to 1
        for (let cd = 1; cd <= 10; cd += 1) {
            // Positive CD, CL from -1 to 1
            let speedPoints = [];
            let coeffPoints = [];
            
            for (let cl = -1; cl <= 1; cl += 0.05) {
                coeffPoints.push({ cl, cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${cd.toFixed(0)}`,
                labelValue: cd
            });
            
            // Negative CD, CL from -1 to 1
            speedPoints = [];
            coeffPoints = [];
            
            for (let cl = -1; cl <= 1; cl += 0.05) {
                coeffPoints.push({ cl, cd: -cd });
                
                const { vxs: vxsMps, vys: vysMps } = coeffToSS(cl, -cd, this.s, this.m, this.rho);
                const vxs = mpsToMph(vxsMps);
                const vys = mpsToMph(vysMps);
                speedPoints.push({ vxs, vys });
            }
            
            this.allLines.push({
                speedPoints,
                coeffPoints,
                color: this.colors.drag,
                type: 'coeff-vertical',
                label: `CD=${(-cd).toFixed(0)}`,
                labelValue: -cd
            });
        }
        
        // Glide ratio lines (through origin in all four quadrants)
        const glideRatios = [
            { ratio: 1, color: this.colors.glide1, label: '1:1 glide' },
            { ratio: 2, color: this.colors.glide2, label: '2:1 glide' },
            { ratio: 3, color: this.colors.glide3, label: '3:1 glide' }
        ];
        
        glideRatios.forEach(({ ratio, color, label }) => {
            // Create four lines for four quadrants
            // Each line goes from center outward
            
            // Quadrant 1: +VXS, +VYS (climbing right)
            const speedPoints1 = [];
            const coeffPoints1 = [];
            for (let vxs = 0; vxs <= 150; vxs += 5) {
                const vys = vxs / ratio;
                speedPoints1.push({ vxs, vys });
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints1.push({ cl, cd });
            }
            
            // Quadrant 2: -VXS, +VYS (climbing left)
            const speedPoints2 = [];
            const coeffPoints2 = [];
            for (let vxs = 0; vxs >= -150; vxs -= 5) {
                const vys = -vxs / ratio;
                speedPoints2.push({ vxs, vys });
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints2.push({ cl, cd });
            }
            
            // Quadrant 3: -VXS, -VYS (descending left)
            const speedPoints3 = [];
            const coeffPoints3 = [];
            for (let vxs = 0; vxs >= -150; vxs -= 5) {
                const vys = vxs / ratio;
                speedPoints3.push({ vxs, vys });
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints3.push({ cl, cd });
            }
            
            // Quadrant 4: +VXS, -VYS (descending right) - original quadrant
            const speedPoints4 = [];
            const coeffPoints4 = [];
            for (let vxs = 0; vxs <= 150; vxs += 5) {
                const vys = -vxs / ratio;
                speedPoints4.push({ vxs, vys });
                const vxsMps = mphToMps(vxs);
                const vysMps = mphToMps(vys);
                const { cl, cd } = ssToCoeff(vxsMps, vysMps, this.s, this.m, this.rho);
                coeffPoints4.push({ cl, cd });
            }
            
            // Add all four quadrant lines
            this.allLines.push({
                speedPoints: speedPoints1,
                coeffPoints: coeffPoints1,
                color: color,
                type: 'glide',
                label: label,
                labelValue: ratio
            });
            
            this.allLines.push({
                speedPoints: speedPoints2,
                coeffPoints: coeffPoints2,
                color: color,
                type: 'glide',
                label: label,
                labelValue: ratio
            });
            
            this.allLines.push({
                speedPoints: speedPoints3,
                coeffPoints: coeffPoints3,
                color: color,
                type: 'glide',
                label: label,
                labelValue: ratio
            });
            
            this.allLines.push({
                speedPoints: speedPoints4,
                coeffPoints: coeffPoints4,
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
        this.ctx.fillStyle = this.colors.background;
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
            
            // Check visibility settings - skip if line type is hidden
            if (type === 'horizontal' && !this.visibility.showVertical) return;
            if (type === 'vertical' && !this.visibility.showHorizontal) return;
            if (type === 'coeff-horizontal' && !this.visibility.showLift) return;
            if (type === 'coeff-vertical' && !this.visibility.showDrag) return;
            if (type === 'glide' && !this.visibility.showGlide) return;
            
            // Determine if we should show this label
            // For inner grid (CL/CD from 1-10), only show labels at 1, 5 and 10
            let showLabel = true;
            const absValue = Math.abs(line.labelValue);
            if (type === 'coeff-horizontal' || type === 'coeff-vertical') {
                if (absValue >= 1 && absValue <= 10) {
                    // Inner grid: only show labels for 1, 5 and 10
                    showLabel = (absValue === 1 || absValue === 5 || absValue === 10);
                    
                    // Further filter: only show label on one segment per value
                    // For horizontal lines (constant CL), only label the segment with positive CD values > 1
                    // For vertical lines (constant CD), only label the segment with positive CL values > 1
                    if (showLabel && type === 'coeff-horizontal') {
                        // Check if this segment has CD > 1
                        const hasPosCD = coeffPoints.some(cp => cp.cd > 1);
                        showLabel = hasPosCD;
                    } else if (showLabel && type === 'coeff-vertical') {
                        // Check if this segment has CL > 1
                        const hasPosCD = coeffPoints.some(cp => cp.cl > 1);
                        showLabel = hasPosCD;
                    }
                } else if (absValue > 0 && absValue <= 1) {
                    // Outer grid: also filter to only show label on main segment (CD or CL in -1 to 1 range)
                    // For horizontal lines (constant CL), only label the segment with CD in [-1, 1]
                    // For vertical lines (constant CD), only label the segment with CL in [-1, 1]
                    if (type === 'coeff-horizontal') {
                        // Check if this segment has CD values in the -1 to 1 range
                        const inMainRange = coeffPoints.some(cp => Math.abs(cp.cd) <= 1);
                        const inExtendedRange = coeffPoints.some(cp => Math.abs(cp.cd) > 1);
                        // Only show label if this is the main segment (not extended)
                        showLabel = inMainRange && !inExtendedRange;
                    } else if (type === 'coeff-vertical') {
                        // Check if this segment has CL values in the -1 to 1 range
                        const inMainRange = coeffPoints.some(cp => Math.abs(cp.cl) <= 1);
                        const inExtendedRange = coeffPoints.some(cp => Math.abs(cp.cl) > 1);
                        // Only show label if this is the main segment (not extended)
                        showLabel = inMainRange && !inExtendedRange;
                    }
                }
                // absValue === 0 will show (default showLabel = true)
            }
            
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
            // Glide lines: use 0.85 in speed view (far out), 0.33 in coeff view
            // Inner grid (1, 5, 10): place at crest of ellipse (on axes)
            let labelFraction;
            if (type === 'horizontal' || type === 'vertical') {
                labelFraction = 0.33; // Speed lines at 1/3
            } else if (type === 'glide') {
                // In speed view, place labels far out; in coeff view, use closer in
                labelFraction = this.animationProgress > 0.5 ? 0.33 : 0.85;
            } else {
                // Coefficient lines
                const absValue = Math.abs(line.labelValue);
                
                if (absValue >= 1 && absValue <= 10) {
                    // Inner grid: find the crest of the ellipse (where other coefficient is closest to 0)
                    let minDistance = Infinity;
                    let bestIndex = 0;
                    
                    for (let i = 0; i < coeffPoints.length; i++) {
                        const cp = coeffPoints[i];
                        let distanceToAxis;
                        
                        if (type === 'coeff-horizontal') {
                            // CL line: find where CD is closest to 0 (crest on X-axis)
                            distanceToAxis = -Math.abs(cp.cd);
                        } else {
                            // CD line: find where CL is closest to 0 (crest on Y-axis)
                            distanceToAxis = -Math.abs(cp.cl);
                        }
                        
                        // For value = 1 or -1, only consider points very close to the axis (< 0.1)
                        // to ensure we label at the axis crossing, not elsewhere
                        if (absValue === 1 && distanceToAxis > 0.1) {
                            continue;
                        }
                        
                        if (distanceToAxis < minDistance) {
                            minDistance = distanceToAxis;
                            bestIndex = i;
                        }
                    }
                    
                    labelFraction = bestIndex / numPoints;
                } else {
                    // Outer grid: use 0.85
                    labelFraction = 0.85;
                }
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
                
                // Create interpolation targets (may be mirrored)
                let x2_interp = x2;
                let y2_interp = y2;
                
                // Apply mirrored target logic to force interpolation through origin
                // Check if point needs to cross origin (different quadrants)
                const startQuadX = x1 - cx; // relative to center
                const startQuadY = y1 - cy;
                const targetQuadX = x2 - cx;
                const targetQuadY = y2 - cy;
                
                // Determine if we should use mirrored target
                // Mirror if starting and target are in different quadrants
                const needsMirror = (startQuadX * targetQuadX < 0) || (startQuadY * targetQuadY < 0);
                
                if (needsMirror) {
                    // Calculate mirrored target (swap x and y offsets from center)
                    const x2_mirror = cx + (y2 - cy);
                    const y2_mirror = cy + (x2 - cx);
                    
                    // Calculate current position if we were going to the mirrored target
                    const x_test = x1 + (x2_mirror - x1) * this.animationProgress;
                    const y_test = y1 + (y2_mirror - y1) * this.animationProgress;
                    
                    // Check if we've crossed to the opposite side of origin
                    const currentQuadX = x_test - cx;
                    const currentQuadY = y_test - cy;
                    
                    // If we're still on the same side as we started, use mirrored target
                    const hasCrossed = (startQuadX * currentQuadX < 0) || (startQuadY * currentQuadY < 0);
                    
                    if (!hasCrossed) {
                        x2_interp = x2_mirror;
                        y2_interp = y2_mirror;
                    }
                }
                
                // Interpolate between the two
                const x = x1 + (x2_interp - x1) * this.animationProgress;
                const y = y1 + (y2_interp - y1) * this.animationProgress;
                
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
            
            // Check label visibility settings before storing
            let shouldShowLabel = showLabel;
            if (type === 'horizontal' || type === 'vertical') {
                shouldShowLabel = shouldShowLabel && this.visibility.showSpeedLabels;
            } else if (type === 'coeff-horizontal') {
                if (absValue >= 1) {
                    shouldShowLabel = shouldShowLabel && this.visibility.showInnerCoeffLabels;
                } else {
                    shouldShowLabel = shouldShowLabel && this.visibility.showOuterCoeffLabels;
                }
            } else if (type === 'coeff-vertical') {
                if (absValue >= 1) {
                    shouldShowLabel = shouldShowLabel && this.visibility.showInnerCoeffLabels;
                } else {
                    shouldShowLabel = shouldShowLabel && this.visibility.showOuterCoeffLabels;
                }
            } else if (type === 'glide') {
                shouldShowLabel = shouldShowLabel && this.visibility.showGlideLabels;
            }
            
            // Store label position only if we should show this label
            if (shouldShowLabel && labelX !== undefined && labelY !== undefined) {
                labelPositions.push({ x: labelX, y: labelY, label, color, type });
            }
        });
        
        // Draw all labels after lines
        this.ctx.globalAlpha = 1.0;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        labelPositions.forEach(({ x, y, label, color, type }) => {
            // Draw text without background for transparency
            this.ctx.fillStyle = color;
            this.ctx.fillText(label, x, y);
        });
        
        this.ctx.globalAlpha = 1.0;
        
        // Draw loaded datasets
        this.drawDatasets();
        
        this.drawLabels();
    }
    
    drawDatasets() {
        if (!this.datasetManager) return;
        
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const range = this.getCoeffRange();
        
        const visibleDatasets = this.datasetManager.getVisibleDatasets();
        
        visibleDatasets.forEach(dataset => {
            this.ctx.strokeStyle = dataset.color;
            this.ctx.fillStyle = dataset.color;
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.8;
            
            // Draw line connecting points
            this.ctx.beginPath();
            let started = false;
            
            for (let i = 0; i < dataset.speedData.length; i++) {
                const speedPoint = dataset.speedData[i];
                const coeffPoint = dataset.coeffData[i];
                
                // Calculate position in speed space
                const x1 = cx + (speedPoint.vxs / 150) * (this.canvas.width / 2);
                const y1 = cy + (speedPoint.vys / 150) * (this.canvas.height / 2);
                
                // Calculate position in coefficient space
                const coeff = this.getCoeffValues(coeffPoint);
                const x2 = cx - (coeff.cd / range) * (this.canvas.width / 2);
                const y2 = cy - (coeff.cl / range) * (this.canvas.height / 2);
                
                // Interpolate between the two coordinate systems
                const x = x1 + (x2 - x1) * this.animationProgress;
                const y = y1 + (y2 - y1) * this.animationProgress;
                
                if (isFinite(x) && isFinite(y)) {
                    if (!started) {
                        this.ctx.moveTo(x, y);
                        started = true;
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
            }
            
            this.ctx.stroke();
            
            // Draw points on top of the line
            this.ctx.globalAlpha = 1.0;
            for (let i = 0; i < dataset.speedData.length; i++) {
                const speedPoint = dataset.speedData[i];
                const coeffPoint = dataset.coeffData[i];
                
                // Calculate position in speed space
                const x1 = cx + (speedPoint.vxs / 150) * (this.canvas.width / 2);
                const y1 = cy + (speedPoint.vys / 150) * (this.canvas.height / 2);
                
                // Calculate position in coefficient space
                const coeff = this.getCoeffValues(coeffPoint);
                const x2 = cx - (coeff.cd / range) * (this.canvas.width / 2);
                const y2 = cy - (coeff.cl / range) * (this.canvas.height / 2);
                
                // Interpolate between the two coordinate systems
                const x = x1 + (x2 - x1) * this.animationProgress;
                const y = y1 + (y2 - y1) * this.animationProgress;
                
                if (isFinite(x) && isFinite(y)) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
        
        this.ctx.globalAlpha = 1.0;
    }
    
    drawLabels() {
        this.ctx.fillStyle = this.colors.legend;
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
            this.ctx.fillText(`X-axis: ${xLabel} (drag coefficient, +1 LEFT to -1 RIGHT)`, 150, 45);
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
