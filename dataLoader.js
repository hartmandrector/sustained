/**
 * Data Loader Module
 * Handles parsing of coefficient data files and dataset management
 */

import { coeffToSS, mpsToMph } from './utilities.js';

export class DataSetManager {
    constructor() {
        this.datasets = new Map();
        this.nextId = 1;
    }

    /**
     * Parse text file content and extract stallpoint CL/CD data
     * @param {string} fileContent - The text content of the file
     * @returns {Array} Array of {cl, cd} objects
     */
    parseStallpointData(fileContent) {
        try {
            // Find the stallpoint array in the file (comma after array is optional)
            const stallpointMatch = fileContent.match(/stallpoint:\s*\[(.*?)\]/s);
            
            if (!stallpointMatch) {
                throw new Error('No stallpoint data found in file');
            }

            // Extract the array content
            const arrayContent = '[' + stallpointMatch[1] + ']';
            
            // Parse the JSON array
            const data = JSON.parse(arrayContent);
            
            // Validate the data
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid stallpoint data format');
            }

            // Validate each point has cl and cd
            for (const point of data) {
                if (typeof point.cl !== 'number' || typeof point.cd !== 'number') {
                    throw new Error('Invalid CL/CD values in data');
                }
            }

            return data;
        } catch (error) {
            console.error('Error parsing stallpoint data:', error);
            throw new Error(`Failed to parse file: ${error.message}`);
        }
    }

    /**
     * Convert coefficient data to sustained speed data
     * @param {Array} coeffData - Array of {cl, cd} objects
     * @param {number} rho - Air density
     * @param {number} s - Wing area
     * @param {number} m - Mass
     * @returns {Array} Array of {vxs, vys} objects
     */
    convertToSpeedData(coeffData, rho, s, m) {
        const speedData = [];
        
        for (const point of coeffData) {
            try {
                const speed = coeffToSS(point.cl, point.cd, s, m, rho);
                // Convert from m/s to MPH for display
                speedData.push({
                    vxs: mpsToMph(speed.vxs),
                    vys: mpsToMph(speed.vys),
                    cl: point.cl,  // Keep original coefficients for reference
                    cd: point.cd
                });
            } catch (error) {
                console.warn(`Failed to convert point (CL=${point.cl}, CD=${point.cd}):`, error);
                // Skip invalid points
            }
        }
        
        return speedData;
    }

    /**
     * Add a new dataset from file content
     * @param {string} fileName - Name of the file
     * @param {string} fileContent - Content of the file
     * @param {number} rho - Air density
     * @param {number} s - Wing area
     * @param {number} m - Mass
     * @param {string} color - Hex color for this dataset
     * @returns {string} Dataset ID
     */
    addDataset(fileName, fileContent, rho, s, m, color = '#ff0000') {
        try {
            // Parse the coefficient data
            const coeffData = this.parseStallpointData(fileContent);
            
            // Convert to speed data
            const speedData = this.convertToSpeedData(coeffData, rho, s, m);
            
            if (speedData.length === 0) {
                throw new Error('No valid data points after conversion');
            }

            // Create dataset object
            const id = `dataset-${this.nextId++}`;
            const dataset = {
                id: id,
                name: fileName,
                color: color,
                visible: true,
                coeffData: coeffData,
                speedData: speedData,
                params: { rho, s, m }  // Store parameters used for conversion
            };

            this.datasets.set(id, dataset);
            
            return id;
        } catch (error) {
            console.error('Error adding dataset:', error);
            throw error;
        }
    }

    /**
     * Update dataset color
     * @param {string} id - Dataset ID
     * @param {string} color - New hex color
     */
    updateColor(id, color) {
        const dataset = this.datasets.get(id);
        if (dataset) {
            dataset.color = color;
        }
    }

    /**
     * Toggle dataset visibility
     * @param {string} id - Dataset ID
     * @param {boolean} visible - Visibility state
     */
    updateVisibility(id, visible) {
        const dataset = this.datasets.get(id);
        if (dataset) {
            dataset.visible = visible;
        }
    }

    /**
     * Remove a dataset
     * @param {string} id - Dataset ID
     */
    removeDataset(id) {
        this.datasets.delete(id);
    }

    /**
     * Get a specific dataset
     * @param {string} id - Dataset ID
     * @returns {Object|null} Dataset object or null
     */
    getDataset(id) {
        return this.datasets.get(id) || null;
    }

    /**
     * Get all datasets
     * @returns {Array} Array of dataset objects
     */
    getAllDatasets() {
        return Array.from(this.datasets.values());
    }

    /**
     * Get visible datasets
     * @returns {Array} Array of visible dataset objects
     */
    getVisibleDatasets() {
        return this.getAllDatasets().filter(ds => ds.visible);
    }

    /**
     * Regenerate speed data for all datasets with new parameters
     * @param {number} rho - New air density
     * @param {number} s - New wing area
     * @param {number} m - New mass
     */
    regenerateAllSpeedData(rho, s, m) {
        for (const dataset of this.datasets.values()) {
            dataset.speedData = this.convertToSpeedData(dataset.coeffData, rho, s, m);
            dataset.params = { rho, s, m };
        }
    }

    /**
     * Regenerate speed data for a specific dataset
     * @param {string} id - Dataset ID
     * @param {number} rho - Air density
     * @param {number} s - Wing area
     * @param {number} m - Mass
     */
    regenerateDatasetSpeedData(id, rho, s, m) {
        const dataset = this.datasets.get(id);
        if (dataset) {
            dataset.speedData = this.convertToSpeedData(dataset.coeffData, rho, s, m);
            dataset.params = { rho, s, m };
        }
    }

    /**
     * Clear all datasets
     */
    clearAll() {
        this.datasets.clear();
    }
}
