// utils/skuGenerator.js

/**
 * Generate a SKU (Stock Keeping Unit) for inventory items
 * Format: [Category Code (3 chars)]-[Random Alphanumeric (4 chars)]-[Sequential Number (3 digits)]
 * 
 * @param {string} category - Item category
 * @param {number} sequentialNumber - Optional sequential number (will generate if not provided)
 * @returns {string} - Generated SKU
 */
export function generateSKU(category, sequentialNumber = null) {
    // Create category code (first 3 letters, uppercase)
    const categoryCode = (category || 'GEN')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .padEnd(3, 'X')
        .substring(0, 3);

    // Generate random alphanumeric section (4 chars)
    const alphanumericChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
        randomPart += alphanumericChars.charAt(Math.floor(Math.random() * alphanumericChars.length));
    }

    // Generate sequential number if not provided
    const sequence = sequentialNumber || Math.floor(100 + Math.random() * 900); // 3-digit number (100-999)
    const sequencePart = sequence.toString().padStart(3, '0');

    // Combine parts to create SKU
    return `${categoryCode}-${randomPart}-${sequencePart}`;
}

/**
 * Validate if a string is a properly formatted SKU
 * 
 * @param {string} sku - SKU to validate
 * @returns {boolean} - Whether the SKU is valid
 */
export function isValidSKU(sku) {
    if (!sku || typeof sku !== 'string') return false;

    // SKU pattern: XXX-XXXX-XXX (where X is alphanumeric)
    const skuPattern = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[0-9]{3}$/;
    return skuPattern.test(sku);
}