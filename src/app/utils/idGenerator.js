// src/app/utils/idGenerator.js

// Store configuration - Edit this to change store initials
const STORE_INITIALS = 'TU';
const MAX_ID_NUMBER = 1000;

// Keep track of the highest used ID number in memory
let highestUsedNumber = 0;

/**
 * Generates a user-friendly ID for inventory items using store initials
 * Format: {storeInitials}{sequentialNumber}
 * Example: TU123
 * 
 * @param {Array} existingIds - Array of existing IDs to prevent duplicates
 * @returns {string} A user-friendly store-specific ID
 */
export function generateItemId(existingIds = []) {
    // Update highest used number by examining existing IDs
    if (existingIds && existingIds.length > 0) {
        existingIds.forEach(id => {
            if (id && id.startsWith(STORE_INITIALS)) {
                const numberPart = parseInt(id.substring(STORE_INITIALS.length), 10);
                if (!isNaN(numberPart) && numberPart > highestUsedNumber) {
                    highestUsedNumber = numberPart;
                }
            }
        });
    }

    // Increment to the next available number
    highestUsedNumber += 1;
    
    // Ensure we don't exceed the maximum
    if (highestUsedNumber > MAX_ID_NUMBER) {
        // Reset to 1 if we exceed the maximum (or handle differently as needed)
        highestUsedNumber = 1;
    }
    
    // Format: store initials followed by the number (padded)
    return `${STORE_INITIALS}${highestUsedNumber.toString().padStart(3, '0')}`;
}

/**
 * Validates if an ID follows the expected format for this store
 * 
 * @param {string} id - The ID to validate
 * @returns {boolean} True if the ID is valid
 */
export function validateItemId(id) {
    if (!id) return false;

    // Check if ID follows pattern: {storeInitials}{1-4 digits}
    const pattern = new RegExp(`^${STORE_INITIALS}\\d{1,4}$`);
    return pattern.test(id);
}

/**
 * Extracts the numeric portion from an ID
 * 
 * @param {string} id - The ID to parse
 * @returns {number} The numeric portion, or -1 if invalid
 */
export function getIdNumber(id) {
    if (!validateItemId(id)) return -1;
    
    const numberPart = parseInt(id.substring(STORE_INITIALS.length), 10);
    return isNaN(numberPart) ? -1 : numberPart;
}