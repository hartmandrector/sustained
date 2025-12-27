# Sustained Speeds Chart - Technical Documentation

## Project Overview
An interactive web-based visualization tool for aerodynamic performance data that smoothly interpolates between two coordinate systems: **Speed Axis System** and **Coefficients Axis System**. This chart is designed for analyzing sustained flight performance, glide characteristics, and aerodynamic coefficients.

## Core Concept
The main innovation of this chart is the ability to toggle between two fundamentally different axis systems with smooth visual interpolation. All data (grid lines, glide lines, and data points) transforms seamlessly between coordinate systems over 300-400 animation frames.

---

## Coordinate Systems

### 1. Speed Axis System
**Primary use:** Visualizing sustained flight speeds

- **Horizontal Axis (VXS):** Horizontal Sustained Speed
- **Vertical Axis (VYS):** Vertical Sustained Speed
- **Units:** MPH for display, m/s for internal calculations
- **Aspect Ratio:** Fixed 1:1 (equal scaling on both axes)
- **Origin:** Typically at (0, 0)

**Grid Components:**
- Horizontal speed grid lines
- Vertical speed grid lines
- Glide lines (colored lines from origin extending down-right)
  - Red, Yellow, Blue glide paths
  - Represent different glide ratios

### 2. Coefficients Axis System
**Primary use:** Visualizing aerodynamic coefficients

- **Horizontal Axis:** CD (drag coefficient) or KD (dimensional drag)
- **Vertical Axis:** CL (lift coefficient) or KL (dimensional lift)
- **Toggle Options:**
  - K-coefficients (KL/KD) - dimensional
  - C-coefficients (CL/CD) - non-dimensional

**Coefficient Conversion:**
```
k = 0.5 * ρ * S / m
kl = cl * k / g
kd = cd * k

where:
  ρ (rho) = air density (default: 1.0 kg/m³)
  S = wing area (default: 2.0 m²)
  m = mass (default: 70.0 kg)
  g = gravity constant (9.8 m/s²)
```

**User Inputs:**
- Radio toggle: K-coefficients vs C-coefficients
- Text inputs: ρ, S, m (when C-coefficients selected)

**Grid Components:**
- Horizontal coefficient grid lines (CD/KD values)
- Vertical coefficient grid lines (CL/KD values)
- Transformed speed grid lines (when in coefficient view)
- Transformed glide lines (when in coefficient view)

---

## Data Structure

### Pre-computed Data
All data must be pre-computed in BOTH coordinate systems before rendering:

1. **Speed Grid Lines (in Speed System)**
   - Horizontal lines at constant VYS values
   - Vertical lines at constant VXS values
   
2. **Speed Grid Lines (in Coefficient System)**
   - Transform speed grid to CL/CD or KL/KD coordinates
   - Curved lines in coefficient space

3. **Glide Lines (in Speed System)**
   - Straight lines from origin at specific glide angles
   - Colored: Red, Yellow, Blue

4. **Glide Lines (in Coefficient System)**
   - Transform glide lines to coefficient space
   - Maintain color coding

5. **Coefficient Grid Lines (in Coefficient System)**
   - Horizontal lines at constant CL/KL values
   - Vertical lines at constant CD/KD values

6. **Coefficient Grid Lines (in Speed System)**
   - Transform coefficient grid to VXS/VYS coordinates
   - Curved lines in speed space

### Data Point Format
Each visual element should be stored as:
```javascript
{
  id: "unique_identifier",
  type: "grid_line" | "glide_line" | "data_point",
  color: "#hex_color",
  label: "display_label",
  
  // Position in Speed System
  speedCoords: [
    { x: vxs1, y: vys1 },
    { x: vxs2, y: vys2 },
    // ... more points for curves
  ],
  
  // Position in Coefficient System
  coeffCoords: [
    { x: cd1, y: cl1 },
    { x: cd2, y: cl2 },
    // ... more points for curves
  ],
  
  // Current interpolated position (for rendering)
  currentCoords: [...]
}
```

---

## Animation & Interpolation

### Main Axis Toggle
When user clicks the main axis toggle:
1. Determine direction (Speed → Coeff or Coeff → Speed)
2. Run animation loop for N frames (300-400 frames)
3. For each frame, interpolate all elements
4. Re-render chart

### Interpolation Function
**Exponential interpolation preferred over linear:**

```javascript
function interpolate(start, end, progress, easingType = 'exponential') {
  if (easingType === 'exponential') {
    // Ease-in-out exponential
    let t = progress;
    if (t < 0.5) {
      t = 0.5 * Math.pow(2, 20 * t - 10);
    } else {
      t = 1 - 0.5 * Math.pow(2, -20 * t + 10);
    }
    return start + (end - start) * t;
  }
  // Linear fallback
  return start + (end - start) * progress;
}
```

### Per-Frame Update
```javascript
for each visual element {
  for each point in element {
    point.x = interpolate(
      speedCoords.x, 
      coeffCoords.x, 
      frameIndex / totalFrames
    );
    point.y = interpolate(
      speedCoords.y, 
      coeffCoords.y, 
      frameIndex / totalFrames
    );
  }
  renderElement(element);
}
```

---

## Coordinate Transformations

### Speed to Coefficients
Given a point (VXS, VYS) in speed system, calculate (CD/KD, CL/KL):

```
V = sqrt(VXS² + VYS²)  // Total speed
γ = atan2(VYS, VXS)    // Flight path angle

// For K-coefficients:
KL = -VYS * V / g      // Lift dimension
KD = VXS * V / g       // Drag dimension

// For C-coefficients:
k = 0.5 * ρ * S / m
CL = KL * g / (k * V²)
CD = KD * g / (k * V²)
```

### Coefficients to Speed
Given a point (CD, CL) or (KD, KL), calculate (VXS, VYS):

```
// From K-coefficients:
V = sqrt(g * sqrt(KL² + KD²))
γ = atan2(KL, KD)
VXS = V * cos(γ)
VYS = V * sin(γ)

// From C-coefficients (convert to K first):
k = 0.5 * ρ * S / m
KL = CL * V² * k / g
KD = CD * V² * k / g
// Then use K formulas above
```

**Note:** These transformations may need iterative solving for accurate results.

---

## Axis Conventions

### Speed System
- **Origin:** Bottom-left
- **X-axis (VXS):** Increases to the right (horizontal speed)
- **Y-axis (VYS):** 
  - Positive: upward (climb)
  - Negative: downward (descent)
- **Glide lines:** Extend from origin down-right (negative VYS, positive VXS)

### Coefficient System
- **Origin:** Bottom-left
- **X-axis (CD/KD):** Increases to the right (drag)
- **Y-axis (CL/KL):** Increases upward (lift)
- **Convention:** Standard aerodynamic polar chart

---

## UI Components

### Controls Panel
1. **Main Axis Toggle** (prominent)
   - "Speed View" ⟷ "Coefficients View"
   - Triggers animation

2. **Coefficient Type Toggle**
   - Radio buttons: "K-coefficients" / "C-coefficients"
   - Only active in Coefficients View

3. **Scaling Inputs** (conditional)
   - Visible when C-coefficients selected
   - Inputs: ρ (rho), S, m
   - Defaults: ρ=1.0, S=2.0, m=70.0
   - Real-time recalculation on change

4. **View Controls**
   - Reset View button
   - Toggle Grid button
   - Zoom controls (existing)

5. **Display Info**
   - Current mouse coordinates in active system
   - Current view mode indicator

---

## File Structure (Proposed)

```
sustained/
├── index.html              # Main HTML
├── styles.css              # Styling
├── app.js                  # Main application & UI controls
│
├── chart.js                # Chart rendering engine
├── coordinateSystems.js    # NEW: Speed ⟷ Coeff transformations
├── interpolation.js        # NEW: Animation & easing functions
├── dataCompute.js          # NEW: Pre-compute all grid/glide data
│
├── data/                   # NEW: Data definition folder
│   ├── speedGrids.js       # Speed grid line definitions
│   ├── coeffGrids.js       # Coefficient grid definitions
│   └── glideLines.js       # Glide line definitions
│
├── CLAUDE.md              # This file
└── README.md              # User documentation
```

---

## Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Refactor chart.js to support dual coordinate systems
- [ ] Create coordinateSystems.js with transformation functions
- [ ] Create interpolation.js with easing functions
- [ ] Update data structures to store both coord systems

### Phase 2: Data Computation
- [ ] Create dataCompute.js
- [ ] Define speed grid generation (VXS/VYS lines)
- [ ] Define coefficient grid generation (CL/CD lines)
- [ ] Define glide lines (red, yellow, blue)
- [ ] Implement transformations for all grids
- [ ] Pre-compute all data on load

### Phase 3: UI Updates
- [ ] Add main axis toggle button
- [ ] Add coefficient type toggle (K vs C)
- [ ] Add scaling factor inputs (ρ, S, m)
- [ ] Update coordinate display for active system
- [ ] Add view mode indicator

### Phase 4: Animation System
- [ ] Implement animation loop
- [ ] Test interpolation with different easing curves
- [ ] Optimize performance (requestAnimationFrame)
- [ ] Add animation state management
- [ ] Test edge cases and transitions

### Phase 5: Refinement
- [ ] Verify axis conventions and directions
- [ ] Ensure fixed aspect ratio for speed view
- [ ] Tune animation duration and easing
- [ ] Add labels and legends
- [ ] Style consistency and polish

---

## Technical Challenges

### 1. Coordinate Transformation Accuracy
- Speed ⟷ Coefficient transformations are non-linear
- May require iterative solving for precision
- Need to handle edge cases (zero speed, zero coefficients)

### 2. Grid Line Generation
- Speed grids in coefficient space become curves
- Coefficient grids in speed space become curves
- Need sufficient points for smooth curves

### 3. Animation Performance
- Interpolating hundreds of points across 300+ frames
- Need efficient rendering (requestAnimationFrame)
- Consider using OffscreenCanvas or WebGL for complex animations

### 4. Aspect Ratio Management
- Speed view requires fixed 1:1 aspect ratio
- Coefficient view may have different scaling
- Handle during interpolation without distortion

### 5. User Input Validation
- ρ, S, m must be positive numbers
- Handle invalid inputs gracefully
- Real-time recalculation without lag

---

## Notes & References

- **Units:** Display MPH, calculate m/s internally (1 m/s = 2.23694 mph)
- **Grid Density:** TBD based on visual testing
- **Glide Colors:** Red, Yellow, Blue (specific glide ratios TBD)
- **Animation Duration:** 300-400 frames at 60fps = 5-6.7 seconds
- **Easing:** Exponential ease-in-out for smooth transitions

---

## Future Enhancements

- Import/export flight data
- Multiple glide polar overlays
- Real-time data plotting from GPS/sensors
- 3D visualization option
- Performance analysis tools
- Wind correction vectors
