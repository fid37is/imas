// src/app/utils/skuGenerator.js

/**
 * Generates a standardized SKU (Stock Keeping Unit) code based on item name and category
 * Format: {categoryCode}-{nameCode}-{uniqueNumber}
 * 
 * @param {string} name - The item name
 * @param {string} category - The item category
 * @returns {string} A formatted SKU code
 */
export function generateSKU(name, category) {
    if (!name || !category) {
        return '';
    }

    // Create category code (first 3 letters)
    const categoryCode = category
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
        .substring(0, 3)
        .toUpperCase();

    // Create name code (first 3 letters)
    const nameCode = name
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
        .substring(0, 3)
        .toUpperCase();

    // Create a 4-digit unique number based on timestamp
    const uniqueNumber = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    
    // Combine all parts
    return `${categoryCode}-${nameCode}-${uniqueNumber}`;
}