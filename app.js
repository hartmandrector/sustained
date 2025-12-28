import { SimpleChart } from './chart-simple.js';

// Application state
let chart;
let coeffType = 'c'; // 'k' or 'c' - default to C coefficients

document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    setupControls();
});

/**
 * Initialize the chart
 */
function initializeChart() {
    const canvas = document.getElementById('chartCanvas');
    chart = new SimpleChart(canvas);
}

/**
 * Setup all UI controls
 */
function setupControls() {
    // Main axis toggle
    const mainAxisToggle = document.getElementById('mainAxisToggle');
    
    if (mainAxisToggle) {
        mainAxisToggle.addEventListener('click', () => {
            if (chart && chart.switchCoordinateSystem) {
                const targetView = chart.currentView === 'speed' ? 'coeff' : 'speed';
                
                // Update button text for target view
                if (targetView === 'coeff') {
                    mainAxisToggle.textContent = 'Switch to Speed View';
                    document.getElementById('viewMode').textContent = 'Coefficients View';
                } else {
                    mainAxisToggle.textContent = 'Switch to Coefficients View';
                    document.getElementById('viewMode').textContent = 'Speed View';
                }
                
                chart.switchCoordinateSystem();
            }
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetView');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (chart && chart.reset) {
                chart.reset();
                mainAxisToggle.textContent = 'Switch to Coefficients View';
                document.getElementById('viewMode').textContent = 'Speed View';
            }
        });
    }
    
    // Toggle grid button
    const toggleGridBtn = document.getElementById('toggleGrid');
    if (toggleGridBtn) {
        toggleGridBtn.addEventListener('click', () => {
            if (chart && chart.toggleGrid) {
                chart.toggleGrid();
            }
        });
    }
    
    // Coefficient type toggle
    const coeffTypeRadios = document.querySelectorAll('input[name="coeffType"]');
    const scalingInputs = document.getElementById('scalingInputs');
    const coeffModeDisplay = document.getElementById('coeffMode');
    
    coeffTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            coeffType = e.target.value;
            
            // Update coefficient mode display
            if (coeffModeDisplay) {
                coeffModeDisplay.textContent = coeffType === 'k' ? 'K-coefficients' : 'C-coefficients';
            }
            
            // Show/hide scaling inputs based on coefficient type
            if (scalingInputs) {
                if (coeffType === 'c') {
                    scalingInputs.style.display = 'flex';
                } else {
                    scalingInputs.style.display = 'none';
                }
            }
            
            // Update chart coefficient type
            if (chart) {
                chart.coeffType = coeffType;
                chart.render();
            }
        });
    });
    
    // Scaling input handlers
    const rhoInput = document.getElementById('rhoInput');
    const sInput = document.getElementById('sInput');
    const mInput = document.getElementById('mInput');
    
    if (rhoInput) {
        rhoInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (chart && !isNaN(value) && value > 0) {
                chart.rho = value;
                chart.generateGrid();
                chart.render();
            }
        });
    }
    
    if (sInput) {
        sInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (chart && !isNaN(value) && value > 0) {
                chart.s = value;
                chart.generateGrid();
                chart.render();
            }
        });
    }
    
    if (mInput) {
        mInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (chart && !isNaN(value) && value > 0) {
                chart.m = value;
                chart.generateGrid();
                chart.render();
            }
        });
    }
    
    // Color customization handlers
    const colorInputs = {
        liftColor: 'lift',
        dragColor: 'drag',
        horizontalColor: 'horizontal',
        verticalColor: 'vertical',
        glide1Color: 'glide1',
        glide2Color: 'glide2',
        glide3Color: 'glide3',
        backgroundColor: 'background',
        legendColor: 'legend'
    };
    
    Object.entries(colorInputs).forEach(([inputId, colorKey]) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => {
                if (chart) {
                    chart.updateColors({ [colorKey]: e.target.value });
                }
            });
        }
    });
    
    // Visibility checkbox handlers
    const visibilityCheckboxes = {
        showLift: 'showLift',
        showDrag: 'showDrag',
        showHorizontal: 'showHorizontal',
        showVertical: 'showVertical',
        showGlide: 'showGlide',
        showInnerCoeffLabels: 'showInnerCoeffLabels',
        showOuterCoeffLabels: 'showOuterCoeffLabels',
        showSpeedLabels: 'showSpeedLabels',
        showGlideLabels: 'showGlideLabels'
    };
    
    Object.entries(visibilityCheckboxes).forEach(([checkboxId, visibilityKey]) => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (chart) {
                    chart.updateVisibility({ [visibilityKey]: e.target.checked });
                }
            });
        }
    });
}
