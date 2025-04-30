// src/utils/skuGenerator.js

/**
 * Generate a SKU based on item name and category
 * Format: CAT-NAME-RANDOM
 * 
 * @param {String} name - Product name
 * @param {String} category - Product category
 * @returns {String} Generated SKU
 */
export const generateSKU = (name, category) => {
    if (!name || !category) {
        return '';
    }

    // Format the category prefix (first 3 letters, uppercase)
    const categoryPrefix = category
        .slice(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    // Format the name part (first 5 letters, uppercase)
    const namePart = name
        .slice(0, 5)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    // Generate random suffix (4 digits)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // Combine all parts with hyphens
    return `${categoryPrefix}-${namePart}-${randomSuffix}`;
};

/**
 * Validate SKU format
 * @param {String} sku - The SKU to validate
 * @returns {Boolean} Whether the SKU is valid
 */
export const isValidSKU = (sku) => {
    // Basic validation - SKUs should be in format XXX-XXXXX-XXXX
    const skuRegex = /^[A-Z0-9]{1,3}-[A-Z0-9]{1,5}-[0-9]{4}$/;
    return skuRegex.test(sku);
};