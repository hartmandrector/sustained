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

- **Flight Performance Analysis**: Visualize sustained speed envelopes
- **Glide Ratio Studies**: Compare different glide paths
- **Coefficient Analysis**: Understand lift-drag relationships
- **Education**: Demonstrate coordinate system transformations
- **Data Exploration**: Interactive investigation of aerodynamic relationships

## Future Enhancements

- Origin-based interpolation for physically accurate transformations
- Import/export flight data
- Multiple glide polar overlays
- Real-time data plotting from sensors
- Performance bounds calculation
- 3D visualization option

---

**Note**: This tool displays mathematical relationships for sustained flight conditions where speeds and coefficients maintain fixed relationships through force balance equations.
