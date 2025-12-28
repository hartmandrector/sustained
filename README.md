# Sustained Speeds Chart

An interactive aerodynamic visualization tool that seamlessly transforms between speed-space and coefficient-space coordinate systems. Built for analyzing sustained flight performance with smooth, real-time interpolation between fundamentally different axis representations.

## Overview

This application provides a unique dual-coordinate visualization system for aerodynamic analysis. Watch as grid lines morph from straight speed lines into curved coefficient lines and back, revealing the relationship between sustained speeds (VXS, VYS) and aerodynamic coefficients (CL, CD or KL, KD).

## Key Features

### Dual Coordinate Systems
- **Speed View**: Visualize horizontal and vertical sustained speeds (mph)
  - X-axis: VXS (horizontal speed)
  - Y-axis: VYS (vertical speed, negative = descent)
  - Includes glide ratio lines (1:1, 2:1, 3:1)

- **Coefficient View**: View aerodynamic lift and drag coefficients
  - X-axis: CD/KD (drag coefficient, positive = left)
  - Y-axis: CL/KL (lift coefficient)
  - Grid lines transform to show speed relationships

### Smooth Animation
- Beautiful exponential ease-in-out transitions between coordinate systems
- Watch speed grid lines curve into coefficient space and vice versa
- 1.5-second animation maintains spatial relationships throughout

### Flexible Coefficient Modes
- **C-Coefficients** (default): Standard aerodynamic coefficients (CL, CD)
- **K-Coefficients**: Dimensional coefficients with physical scaling
  - Automatic unit selection (milli/micro) for optimal readability
  - Configurable parameters: ρ (air density), S (wing area), m (mass)
  - Real-time grid regeneration when parameters change

### Interactive Controls
- Pan and zoom the chart for detailed inspection
- Toggle grid visibility
- Reset view to defaults
- Switch between coefficient types without regenerating base data

### Polar Data Loading
- Load aerodynamic polar data from text files
- Support for multiple datasets simultaneously
- Per-dataset color customization
- Individual show/hide toggles for each dataset
- Automatic coordinate conversion respecting current parameters
- Seamless transformation between speed and coefficient views

## Getting Started

### Quick Start
1. Open `index.html` in a modern web browser
2. Click "Switch to Coefficients View" to see the transformation
3. Use the coefficient type toggle to switch between K and C modes
4. Adjust ρ, S, and m values when in C-coefficient mode to see how scaling affects the visualization

### Controls
- **Main View Toggle**: Switch between Speed and Coefficient views
- **Reset View**: Return to default Speed view
- **Toggle Grid**: Show/hide grid lines
- **Coefficient Type**: Choose K-coefficients or C-coefficients
- **Scaling Inputs** (C-mode only): Adjust ρ, S, m parameters
- **Load Data File**: Import polar data from text files
- **Dataset Controls**: Color picker, visibility toggle, and remove button for each loaded dataset

## Loading Polar Data

### File Format
The application can load aerodynamic polar data from text files containing `stallpoint` arrays with CL/CD coefficient pairs:

```javascript
stallpoint: [
  {"cl":0.486,"cd":0.485},
  {"cl":0.499,"cd":0.469},
  {"cl":0.515,"cd":0.456},
  // ... more points
]
```

### How to Load Data
1. Click **"Load Data File"** button in the Data Files section
2. Select a text file (.txt or .js) containing polar data
3. The dataset appears in the list with a random color
4. The polar curve is drawn on the chart, transforming with the coordinate system

### Dataset Management
Each loaded dataset has individual controls:
- **Color Picker**: Customize the line and point color
- **Visibility Checkbox**: Show or hide the dataset
- **Remove Button**: Delete the dataset from the chart

### Automatic Conversion
- Polar data is parsed from coefficient space (CL, CD)
- Converted to sustained speeds using current ρ, S, m parameters
- Updates automatically when you change scaling parameters
- Displays correctly in both speed and coefficient views
- Works seamlessly with K/C coefficient switching

### Multiple Datasets
Load multiple polar curves to compare different wings, conditions, or configurations:
- Each dataset maintains its own color and visibility
- All datasets transform together during view switching
- Parameter changes (ρ, S, m) update all datasets simultaneously

## Technical Details

### Axis Conventions
- **Speed View**: Y-axis reversed (negative VYS at top) following descent convention
- **Coefficient View**: X-axis reversed (positive drag on left) following aerodynamic convention

### Coordinate Transformations
- Speed to Coefficient: Uses sustained speed equations with scaling factor k = 0.5 × ρ × S / m
- All grid lines pre-computed in both coordinate systems
- Interpolation performed on screen coordinates for smooth visual transitions

### File Structure
```
sustained/
├── index.html          # Application UI
├── styles.css          # Visual styling
├── app.js              # UI controls and event handling
├── chart-simple.js     # Main chart rendering and animation
├── dataLoader.js       # Polar data parsing and management
├── utilities.js        # Coordinate conversion functions
├── interpolation.js    # Easing functions
└── README.md          # This file
```

## Technology Stack

- **Pure JavaScript**: No external dependencies
- **HTML5 Canvas**: Hardware-accelerated 2D rendering
- **CSS3**: Modern styling and flexbox layouts
- **Module System**: ES6 imports for clean code organization

## Use Cases

- **Flight Performance Analysis**: Visualize sustained speed envelopes and load real polar data
- **Glide Ratio Studies**: Compare different glide paths and multiple wing polars
- **Coefficient Analysis**: Understand lift-drag relationships with actual flight data
- **Wing Comparison**: Load multiple polar curves to compare performance characteristics
- **Education**: Demonstrate coordinate system transformations with real aerodynamic data
- **Data Exploration**: Interactive investigation of aerodynamic relationships

## Future Enhancements

- Drag-and-drop file upload
- Export/import workspace with all datasets
- Dataset naming and annotation
- Performance bounds calculation
- Real-time data plotting from sensors
- 3D visualization option

---

**Note**: This tool displays mathematical relationships for sustained flight conditions where speeds and coefficients maintain fixed relationships through force balance equations.
