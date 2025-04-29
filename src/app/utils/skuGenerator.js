/**
 * Generates a SKU based on item name and category
 * Format: CAT-NAME-RANDOM
 * 
 * @param {string} name - Item name
 * @param {string} category - Item category
 * @returns {string} - Generated SKU
 */
export const generateSKU = (name, category) => {
    // Get first 3 characters of category (uppercase)
    const categoryCode = category.substring(0, 3).toUpperCase();
    
    // Get first 4 characters of name (uppercase), removing spaces
    const nameCode = name.replace(/\s/g, '').substring(0, 4).toUpperCase();
    
    // Generate random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    // Combine all parts with hyphens
    return `${categoryCode}-${nameCode}-${randomNum}`;
};

/**
 * Validates if a SKU is in the correct format
 * 
 * @param {string} sku - SKU to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateSKU = (sku) => {
    // Basic validation - adjust the regex pattern based on your SKU format requirements
    const skuPattern = /^[A-Z]{3}-[A-Z]{1,4}-\d{4}$/;
    return skuPattern.test(sku);
};