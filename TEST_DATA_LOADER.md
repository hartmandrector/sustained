# Data Loader Testing Guide

## Overview
The data loader system is now fully implemented! Here's how to use it:

## How to Test

1. **Start the server** (if not already running):
   ```
   npx http-server -p 8000
   ```

2. **Open the application** in your browser:
   ```
   http://localhost:8000
   ```

3. **Load a data file**:
   - Look for the "Data Files" section in the controls (should be expanded by default)
   - Click the "Load Data File" button
   - Select the "Aura 6.txt" file you attached
   - The dataset will appear with a random color

4. **Manage datasets**:
   - **Change color**: Click the color picker for any dataset
   - **Hide/show**: Use the checkbox next to each dataset
   - **Remove**: Click the "Remove" button to delete a dataset
   - **Load multiple**: You can load as many files as you want!

## Features Implemented

### Data Parsing
- ✅ Parses `stallpoint` array from text files
- ✅ Extracts CL/CD coefficient pairs
- ✅ Validates data format

### Coordinate Conversion
- ✅ Converts coefficients to sustained speeds using `coeffToSS()`
- ✅ Respects current ρ, S, and m parameters
- ✅ Automatically regenerates when parameters change

### Visualization
- ✅ Draws dataset as connected line with points
- ✅ Interpolates smoothly between speed and coefficient views
- ✅ Color customization per dataset
- ✅ Visibility toggle per dataset

### UI Controls
- ✅ File upload button
- ✅ Dynamic dataset list
- ✅ Color picker per dataset
- ✅ Show/hide checkbox per dataset
- ✅ Remove button per dataset

## Expected Behavior

When you load "Aura 6.txt":
1. A new item appears in the dataset list with the filename
2. A colored line with dots appears on the chart showing the wingsuit polar
3. The line transforms smoothly when switching between speed and coefficient views
4. Changing ρ, S, or m parameters updates the line position in speed view
5. The line always passes through the origin (as the data represents a polar curve)

## File Format

The data loader expects text files with this format:
```javascript
stallpoint: [{"cl":0.486,"cd":0.485},{"cl":0.499,"cd":0.469},...],
```

The parser:
- Finds the `stallpoint:` property
- Extracts the array content
- Parses as JSON
- Validates that each point has `cl` and `cd` numbers

## Multiple Datasets

You can load multiple files:
- Each gets a unique random color (HSL-based for good distribution)
- Each can be independently shown/hidden
- Each can have its color changed
- Each can be removed without affecting others
- All datasets update when you change ρ, S, or m parameters

## Color Generation

Random colors use HSL:
- Hue: 0-360° (full spectrum)
- Saturation: 70-90% (vibrant)
- Lightness: 45-55% (good contrast)

This ensures visually distinct colors that work well on the white/gray background.

## Integration with Existing Features

The data loader works seamlessly with:
- ✅ Speed ↔ Coefficient view switching
- ✅ K/C coefficient toggle
- ✅ Parameter changes (ρ, S, m)
- ✅ Grid show/hide
- ✅ All customization options
- ✅ Background color changes

## Known Limitations

- Only parses `stallpoint` array (not other data in the file)
- File must be valid JavaScript/JSON format
- No undo functionality (but you can reload files)
- No dataset naming/renaming (uses filename)

## Next Steps for Enhancement (Optional)

Future improvements could include:
- Drag-and-drop file upload
- Dataset naming/renaming
- Export/import workspace with all datasets
- Dataset comparison tools
- Performance metrics display
- Dataset styling options (line width, point size, dashed lines)
