// src/app/utils/idGenerator.js

// Store configuration - Edit this to change store initials
const STORE_INITIALS = 'sk';
const MAX_ID_NUMBER = 9999;

// Keep track of the highest used number in memory
let highestUsedNumber = 0;

/**
 * Finds the highest ID number from existing items
 * 
 * @param {Array} existingIds - Array of existing IDs
 * @returns {number} The highest ID number found
 */
function findHighestIdNumber(existingIds = []) {
    let highest = 0;
    
    existingIds.forEach(id => {
        if (id && typeof id === 'string' && id.startsWith(STORE_INITIALS)) {
            const numberPart = parseInt(id.substring(STORE_INITIALS.length), 10);
            if (!isNaN(numberPart) && numberPart > highest) {
                highest = numberPart;
            }
        }
    });
    
    return highest;
}

/**
 * Generates a user-friendly ID for inventory items using store initials
 * Format: {storeInitials}{sequentialNumber}
 * Example: TU123
 * 
 * @param {Array} existingIds - Array of existing IDs to prevent duplicates
 * @returns {string} A user-friendly store-specific ID
 */
export function generateItemId(existingIds = []) {
    // First try to get highest ID from localStorage for persistence
    try {
        const storedHighestId = localStorage.getItem('highestInventoryId');
        if (storedHighestId) {
            highestUsedNumber = parseInt(storedHighestId, 10);
        }
    } catch (error) {
        console.warn('Could not access localStorage for ID persistence:', error);
    }
    
    // Then check existingIds to ensure we're always higher than any existing ID
    const highestExistingId = findHighestIdNumber(existingIds);
    
    // Use the higher of our stored value or what we found in existing IDs
    highestUsedNumber = Math.max(highestUsedNumber, highestExistingId);
    
    // Increment to the next available number
    highestUsedNumber += 1;
    
    // Ensure we don't exceed the maximum
    if (highestUsedNumber > MAX_ID_NUMBER) {
        highestUsedNumber = 1; // Reset to 1 if we exceed the maximum
    }
    
    // Store the new highest number in localStorage for persistence
    try {
        localStorage.setItem('highestInventoryId', highestUsedNumber.toString());
    } catch (error) {
        console.warn('Could not store highest ID in localStorage:', error);
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

/**
 * Initializes the ID generator with existing inventory data
 * Call this function when your app loads with all existing inventory IDs
 * 
 * @param {Array} existingIds - Array of all existing inventory IDs
 */
export function initializeIdGenerator(existingIds = []) {
    const highestExistingId = findHighestIdNumber(existingIds);
    
    // Update localStorage and memory with the highest ID
    if (highestExistingId > 0) {
        highestUsedNumber = highestExistingId;
        try {
            localStorage.setItem('highestInventoryId', highestExistingId.toString());
        } catch (error) {
            console.warn('Could not initialize highest ID in localStorage:', error);
        }
    }
}