import { SimpleChart } from './chart-simple.js';
import { DataSetManager } from './dataLoader.js';

// Application state
let chart;
let coeffType = 'c'; // 'k' or 'c' - default to C coefficients
let datasetManager;

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
    
    // Initialize dataset manager
    datasetManager = new DataSetManager();
    chart.datasetManager = datasetManager;
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
                // Regenerate dataset speed data with new parameters
                if (datasetManager) {
                    datasetManager.regenerateAllSpeedData(value, chart.s, chart.m);
                }
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
                // Regenerate dataset speed data with new parameters
                if (datasetManager) {
                    datasetManager.regenerateAllSpeedData(chart.rho, value, chart.m);
                }
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
                // Regenerate dataset speed data with new parameters
                if (datasetManager) {
                    datasetManager.regenerateAllSpeedData(chart.rho, chart.s, value);
                }
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
    
    // Data file upload handlers
    setupDataFileUpload();
}

/**
 * Setup data file upload functionality
 */
function setupDataFileUpload() {
    const uploadBtn = document.getElementById('uploadDataBtn');
    const fileInput = document.getElementById('dataFileInput');
    const datasetList = document.getElementById('datasetList');
    
    if (uploadBtn && fileInput) {
        // Trigger file input when button is clicked
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadDataFile(file);
            }
            // Reset input so same file can be loaded again
            fileInput.value = '';
        });
    }
}

/**
 * Load and parse a data file
 */
function loadDataFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            
            // Generate random color for this dataset
            const color = getRandomColor();
            
            // Get current parameters from chart
            const rho = chart.rho;
            const s = chart.s;
            const m = chart.m;
            
            // Add dataset to manager
            const datasetId = datasetManager.addDataset(file.name, content, rho, s, m, color);
            
            // Create UI control for this dataset
            addDatasetControl(datasetId, file.name, color);
            
            // Redraw chart
            chart.render();
            
        } catch (error) {
            alert(`Error loading file: ${error.message}`);
            console.error('File load error:', error);
        }
    };
    
    reader.onerror = () => {
        alert('Error reading file');
    };
    
    reader.readAsText(file);
}

/**
 * Add UI controls for a dataset
 */
function addDatasetControl(datasetId, fileName, color) {
    const datasetList = document.getElementById('datasetList');
    if (!datasetList) return;
    
    // Create dataset item container
    const datasetItem = document.createElement('div');
    datasetItem.className = 'dataset-item';
    datasetItem.id = `dataset-${datasetId}`;
    
    // Dataset name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'dataset-name';
    nameSpan.textContent = fileName;
    nameSpan.title = fileName; // Show full name on hover
    
    // Controls container
    const controls = document.createElement('div');
    controls.className = 'dataset-controls';
    
    // Color picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color;
    colorInput.className = 'dataset-color';
    colorInput.addEventListener('change', (e) => {
        datasetManager.updateColor(datasetId, e.target.value);
        chart.render();
    });
    
    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'dataset-checkbox';
    checkbox.addEventListener('change', (e) => {
        datasetManager.updateVisibility(datasetId, e.target.checked);
        chart.render();
    });
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'dataset-remove';
    removeBtn.addEventListener('click', () => {
        datasetManager.removeDataset(datasetId);
        datasetItem.remove();
        chart.render();
    });
    
    // Assemble controls
    controls.appendChild(colorInput);
    controls.appendChild(checkbox);
    controls.appendChild(removeBtn);
    
    datasetItem.appendChild(nameSpan);
    datasetItem.appendChild(controls);
    
    datasetList.appendChild(datasetItem);
}

/**
 * Generate a random color for datasets
 */
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 45 + Math.floor(Math.random() * 10); // 45-55%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
