# Sustained Speeds Chart

An interactive web-based application for drawing and visualizing sustained speeds charts with moveable and transformable axes.

## Features

- **Interactive Canvas**: Draw and visualize speed data over time
- **Moveable Axes**: Click and drag the X and Y axes to reposition them
- **Pan & Zoom**: 
  - Drag anywhere on the chart to pan
  - Use mouse wheel to zoom in/out
- **Grid System**: Toggle-able grid for better visualization
- **Customizable Labels**: Change axis labels dynamically
- **Real-time Coordinates**: See the current mouse position in chart coordinates

## Getting Started

1. Open `index.html` in a web browser
2. Interact with the chart:
   - **Pan**: Click and drag on the chart background
   - **Move Axes**: Click and drag directly on an axis line
   - **Zoom**: Scroll with mouse wheel
   - **Reset**: Click the "Reset View" button
   - **Toggle Grid**: Click the "Toggle Grid" button

## File Structure

```
sustained/
├── index.html      # Main HTML file
├── styles.css      # Styling and layout
├── chart.js        # Chart rendering and interaction logic
├── app.js          # Application initialization and controls
└── README.md       # This file
```

## Future Enhancements

- Add data point editing (add/remove/move points)
- Import/export data functionality
- Multiple data series support
- Axis scaling controls
- Custom color schemes
- Save chart as image
- Responsive mobile support

## Technology Stack

- HTML5 Canvas for rendering
- Vanilla JavaScript (no dependencies)
- CSS3 for modern styling
