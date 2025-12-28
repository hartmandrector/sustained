import { coeffToSS, ssToCoeff, mphToMps, mpsToMph } from './utilities.js';
import { easeInOutExpo, easeZoom } from './interpolation.js';

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
        
        // Zoom state
        this.quadrantZoom = false; // Whether quadrant zoom is enabled
        
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
            showInnerSpeeds: true,
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
        
        // Inner horizontal speed lines (constant VYS, -30 to 30)
        for (let vys of [-30, -20, -10, 10, 20, 30]) {
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
                type: 'horizontal-inner',
                label: `VYS=${vys}`,
                labelValue: vys
            });
        }
        
        // Inner vertical speed lines (constant VXS, -30 to 30)
        for (let vxs of [-30, -20, -10, 10, 20, 30]) {
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
                type: 'vertical-inner',
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
    
    /**
     * Calculate zoom transformation parameters based on quadrant zoom and animation progress
     * Returns { offsetX, offsetY, scale }
     */
    getZoomTransform() {
        if (!this.quadrantZoom) {
            // No zoom - standard view
            return { offsetX: 0, offsetY: 0, scale: 1.0 };
        }
        
        // Quadrant zoom is enabled
        // Use inverse easing for zoom (fast at ends, slow in middle)
        const t = this.animationProgress;
        const easedZoom = easeZoom(t);
        
        // Get data bounds if datasets are loaded
        let dataBounds = this.calculateDataBounds(t);
        
        // At t=0 (speed view): zoom to bottom-right quadrant (positive VXS, positive VYS)
        // At t=0.5 (transition): zoom out to show all quadrants
        // At t=1 (coeff view): zoom to upper-left quadrant (negative CD, positive CL)
        
        // Calculate zoom scale using zoom easing and data bounds
        // At endpoints (0 and 1): scale to fit data in one quadrant
        // At middle (0.5): scale = 0.8 (zoomed out during transition)
        const scaleAtMid = 0.8;  // Zoom out during transition
        
        let scale;
        if (easedZoom < 0.5) {
            // First half: zoom from data-fitted scale down to 0.8
            scale = dataBounds.scale + (scaleAtMid - dataBounds.scale) * (easedZoom / 0.5);
        } else {
            // Second half: zoom from 0.8 back up to data-fitted scale
            scale = scaleAtMid + (dataBounds.scale - scaleAtMid) * ((easedZoom - 0.5) / 0.5);
        }
        
        // Calculate pan offset (as fraction of canvas) using zoom easing
        // Canvas translate: positive offset moves content (showing opposite side)
        //   - negative offsetX shifts content left → shows RIGHT side (+VXS)
        //   - negative offsetY shifts content up → shows BOTTOM (+VYS in their convention)
        // At t=0 (speed view): show bottom-right quadrant (+VXS, +VYS)
        // At t=0.5: centered (no offset)
        // At t=1 (coeff view): show upper-left quadrant (-CD, +CL)
        
        let offsetX, offsetY;
        if (easedZoom < 0.5) {
            // First half: pan from bottom-right to center
            const panProgress = easedZoom / 0.5;
            // Speed view bottom-right: use data-based offset
            offsetX = dataBounds.offsetX * (1 - panProgress);  // From data offset to 0
            offsetY = dataBounds.offsetY * (1 - panProgress);  // From data offset to 0
        } else {
            // Second half: pan from center to upper-left
            const panProgress = (easedZoom - 0.5) / 0.5;
            // Coeff view upper-left: use data-based offset
            offsetX = dataBounds.offsetX * panProgress;   // From 0 to data offset
            offsetY = dataBounds.offsetY * panProgress;   // From 0 to data offset
        }
        
        return { offsetX, offsetY, scale };
    }
    
    /**
     * Calculate data bounds for zoom fitting
     * Returns { scale, offsetX, offsetY } based on loaded data
     */
    calculateDataBounds(animationProgress) {
        // Default values (no data or data doesn't affect bounds)
        let defaultScale = 2.0;  // Standard quadrant zoom
        let defaultOffsetX = -0.25;  // Speed view: bottom-right
        let defaultOffsetY = -0.25;
        
        // Check if we're closer to speed view (t < 0.5) or coeff view (t >= 0.5)
        const useSpeedView = animationProgress < 0.5;
        
        if (!this.datasetManager) {
            // At coeff view (t >= 0.5), invert offsets for upper-left quadrant
            if (!useSpeedView) {
                defaultOffsetX = 0.25;
                defaultOffsetY = 0.25;
            }
            return { scale: defaultScale, offsetX: defaultOffsetX, offsetY: defaultOffsetY };
        }
        
        const visibleDatasets = this.datasetManager.getVisibleDatasets();
        if (visibleDatasets.length === 0) {
            // At coeff view (t >= 0.5), invert offsets for upper-left quadrant
            if (!useSpeedView) {
                defaultOffsetX = 0.25;
                defaultOffsetY = 0.25;
            }
            return { scale: defaultScale, offsetX: defaultOffsetX, offsetY: defaultOffsetY };
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        if (useSpeedView) {
            // Use speed data bounds
            for (const dataset of visibleDatasets) {
                for (const point of dataset.speedData) {
                    if (point.vxs > maxX) maxX = point.vxs;
                    if (point.vxs < minX) minX = point.vxs;
                    if (point.vys > maxY) maxY = point.vys;
                    if (point.vys < minY) minY = point.vys;
                }
            }
            
            // Speed view focuses on bottom-right quadrant (positive VXS, positive VYS)
            // Ensure we include the origin and positive values
            minX = Math.min(minX, 0);
            minY = Math.min(minY, 0);
            maxX = Math.max(maxX, 0);
            maxY = Math.max(maxY, 0);
            
            // Calculate required range (using positive quadrant)
            const rangeX = maxX;
            const rangeY = maxY;
            const maxRange = Math.max(rangeX, rangeY);
            
            // Standard view shows ±150 mph, one quadrant shows 0 to 150
            // Scale = how much we need to fit the data
            // If data goes to 150, scale = 2.0 (standard)
            // If data goes to 200, scale = 150/200 * 2.0 = 1.5 (zoom out more)
            const standardQuadrantRange = 150;
            const scaleAdjustment = standardQuadrantRange / Math.max(maxRange, standardQuadrantRange);
            const scale = 2.0 * scaleAdjustment;
            
            // Calculate center of data in positive quadrant
            const centerX = maxX / 2;
            const centerY = maxY / 2;
            
            // Convert to offset (as fraction of canvas half-width)
            // Offset is negative to show positive values
            const offsetX = -(centerX / standardQuadrantRange) * 0.5;
            const offsetY = -(centerY / standardQuadrantRange) * 0.5;
            
            return { scale, offsetX, offsetY };
        } else {
            // Use coefficient data bounds
            const range = this.getCoeffRange();
            
            for (const dataset of visibleDatasets) {
                for (const point of dataset.coeffData) {
                    const coeff = this.getCoeffValues(point);
                    if (coeff.cd > maxX) maxX = coeff.cd;
                    if (coeff.cd < minX) minX = coeff.cd;
                    if (coeff.cl > maxY) maxY = coeff.cl;
                    if (coeff.cl < minY) minY = coeff.cl;
                }
            }
            
            // Coeff view focuses on upper-left quadrant (negative CD, positive CL)
            // Ensure we include the origin
            minX = Math.min(minX, 0);
            maxX = Math.max(maxX, 0);
            minY = Math.min(minY, 0);
            maxY = Math.max(maxY, 0);
            
            // Calculate the extent in the upper-left quadrant direction
            const rangeXLeft = Math.abs(minX);  // Extent to the left (negative CD)
            const rangeYUp = maxY;               // Extent upward (positive CL)
            
            // We want to show upper-left quadrant, so use the maximum extent in that direction
            const maxDataRange = Math.max(rangeXLeft, rangeYUp);
            
            // Standard view shows ±range, one quadrant shows 0 to range
            const standardQuadrantRange = range;
            
            // Adjust scale to fit the data, but allow some extra room
            const scaleAdjustment = standardQuadrantRange / Math.max(maxDataRange * 1.2, standardQuadrantRange);
            const scale = 2.0 * scaleAdjustment;
            
            // Base offset for upper-left quadrant
            let offsetX = 0.25;
            let offsetY = 0.25;
            
            // Fine-tune offset based on data center within the quadrant
            // Data extends from minX to 0 in X, and 0 to maxY in Y
            const centerX = minX / 2;  // Center of data range (negative)
            const centerY = maxY / 2;  // Center of data range (positive)
            
            // Adjust offsets to center on data (small adjustments to base 0.25)
            offsetX += (Math.abs(centerX) / standardQuadrantRange) * 0.1;
            offsetY += (centerY / standardQuadrantRange) * 0.1;
            
            return { scale, offsetX, offsetY };
        }
    }

    draw() {
        // Clear
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Get zoom transformation
        const zoom = this.getZoomTransform();
        
        // Apply zoom transformation
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.scale(zoom.scale, zoom.scale);
        this.ctx.translate(-cx + zoom.offsetX * this.canvas.width, -cy + zoom.offsetY * this.canvas.height);
        
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
            this.ctx.restore();
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
            if (type === 'horizontal-inner' && !this.visibility.showInnerSpeeds) return;
            if (type === 'vertical-inner' && !this.visibility.showInnerSpeeds) return;
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
                
                // DISABLED: Mirrored target logic for forcing interpolation through origin
                /*
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
                */
                
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
        
        // Restore context (undo zoom transformation)
        this.ctx.restore();
        
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
        
        // Position legend on right side
        const legendX = this.canvas.width - 500;
        
        // View label logic: 
        // animationProgress = 0 means speed grid is straight (Speed View)
        // animationProgress = 1 means coeff grid is straight (Coefficient View)
        if (this.animationProgress > 0.5) {
            // Coefficient space labels (coeff grid is straight/rectangular)
            this.ctx.fillText('COEFFICIENT VIEW', legendX, 25);
            this.ctx.font = '12px Arial';
            const xLabel = this.coeffType === 'k' ? 'KD' : 'CD';
            const yLabel = this.coeffType === 'k' ? 'KL' : 'CL';
            this.ctx.fillText(`X-axis: ${xLabel} (drag coefficient, +1 LEFT to -1 RIGHT)`, legendX, 45);
            this.ctx.fillText(`Y-axis: ${yLabel} (lift coefficient, -1 to +1)`, legendX, 65);
            this.ctx.fillText('Speed grid lines are curved in this view', legendX, 85);
        } else {
            // Speed space labels (speed grid is straight/rectangular)
            this.ctx.fillText('SPEED VIEW', legendX, 25);
            this.ctx.font = '12px Arial';
            this.ctx.fillText('X-axis: VXS (horizontal speed, -150 to +150 mph)', legendX, 45);
            this.ctx.fillText('Y-axis: VYS (vertical speed, -150 to +150 mph)', legendX, 65);
            this.ctx.fillText('Red = constant VYS | Blue = constant VXS', legendX, 85);
        }
    }
}
