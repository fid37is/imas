/**
 * Service for interacting with Google Sheets API
 * Modified for static site exports (no server-side API routes)
 */

// Google API configuration - for static exports, these need to be public values
// IMPORTANT: For production, use restricted API keys with proper referrer restrictions
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY; // Required for public access without OAuth
const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SPREADSHEET_ID;

// Sheet names/ranges
const INVENTORY_SHEET_RANGE = 'Inventory!A2:I';
const SALES_SHEET_RANGE = 'Sales!A2:G';

// Column indices in the inventory sheet
const INVENTORY_COLUMNS = {
    ID: 0,
    NAME: 1,
    CATEGORY: 2,
    SKU: 3,
    PRICE: 4,
    COST_PRICE: 5,
    QUANTITY: 6,
    LOW_STOCK_THRESHOLD: 7,
    IMAGE_URL: 8
};

// Track initialization state
let isInitialized = false;
let initializationPromise = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Local storage keys for caching
const STORAGE_KEYS = {
    INVENTORY: 'inventory_data',
    SALES: 'sales_data',
    TIMESTAMP: 'data_timestamp'
};

// Cache expiration time (12 hours in milliseconds)
const CACHE_EXPIRATION = 12 * 60 * 60 * 1000;

/**
 * Load the Google API client with retry logic
 * @returns {Promise} Promise that resolves when the API client is loaded
 */
export const initGoogleAPI = () => {
    // Return existing promise if initialization is in progress
    if (initializationPromise) {
        return initializationPromise;
    }

    // Track attempts
    initializationAttempts = 0;
    
    // Create a new initialization promise
    initializationPromise = new Promise((resolve, reject) => {
        loadGapiWithRetry(resolve, reject);
    });

    return initializationPromise;
};

/**
 * Load the Google API client with retry logic
 * @param {Function} resolve - Promise resolver function
 * @param {Function} reject - Promise reject function
 */
const loadGapiWithRetry = (resolve, reject) => {
    // Check if we've reached the maximum number of attempts
    if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
        console.error(`Failed to load Google API after ${MAX_INITIALIZATION_ATTEMPTS} attempts`);
        initializationPromise = null;
        reject(new Error(`Failed to load Google API after ${MAX_INITIALIZATION_ATTEMPTS} attempts`));
        return;
    }

    initializationAttempts++;
    console.log(`Attempting to load Google API (attempt ${initializationAttempts})`);

    // Use multiple CDN sources for redundancy
    const apiUrls = [
        'https://apis.google.com/js/api.js',
        'https://www.googleapis.com/js/api.js',
        'https://ajax.googleapis.com/ajax/libs/googleapis/1.0/googleapis.js'
    ];
    
    const scriptUrl = apiUrls[initializationAttempts - 1] || apiUrls[0];
    
    // Check if gapi is already loaded
    if (window.gapi) {
        loadGapiClient(resolve, reject);
        return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    
    // Set a timeout for script loading
    const timeoutId = setTimeout(() => {
        console.warn(`Google API script load timed out from ${scriptUrl}`);
        script.onerror = null; // Remove the error handler to prevent duplicate calls
        loadGapiWithRetry(resolve, reject); // Try the next URL
    }, 5000); // 5 second timeout
    
    script.onload = () => {
        clearTimeout(timeoutId);
        console.log('Google API script loaded successfully');
        loadGapiClient(resolve, reject);
    };
    
    script.onerror = () => {
        clearTimeout(timeoutId);
        console.warn(`Failed to load Google API script from ${scriptUrl}`);
        loadGapiWithRetry(resolve, reject); // Try the next URL
    };
    
    document.body.appendChild(script);
};

/**
 * Helper to load the gapi client
 * @param {Function} resolve - Promise resolver function
 * @param {Function} reject - Promise reject function
 */
const loadGapiClient = (resolve, reject) => {
    if (!window.gapi) {
        reject(new Error('Google API client not available'));
        initializationPromise = null;
        return;
    }

    window.gapi.load('client', async () => {
        try {
            // Initialize the client with timeout
            const clientInitPromise = window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });
            
            // Add a timeout to the client initialization
            const timeoutPromise = new Promise((_, rejectTimeout) => {
                setTimeout(() => rejectTimeout(new Error('Google API client initialization timed out')), 10000);
            });
            
            await Promise.race([clientInitPromise, timeoutPromise]);
            
            isInitialized = true;
            console.log('Google API initialized successfully');
            resolve(true);
        } catch (error) {
            console.error('Error initializing Google API client:', error);
            initializationPromise = null;
            reject(error);
        }
    });
};

/**
 * Get cached data from local storage
 * @param {string} type - Type of data ('inventory' or 'sales')
 * @returns {Array|null} Cached data or null if not available
 */
const getCachedData = (type) => {
    if (typeof window === 'undefined') return null;
    
    try {
        const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);
        if (!timestamp || Date.now() - parseInt(timestamp, 10) > CACHE_EXPIRATION) {
            return null; // Cache expired
        }
        
        const data = localStorage.getItem(STORAGE_KEYS[type.toUpperCase()]);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Error reading from cache:', error);
        return null;
    }
};

/**
 * Cache data in local storage
 * @param {string} type - Type of data ('inventory' or 'sales')
 * @param {Array} data - Data to cache
 */
const cacheData = (type, data) => {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.setItem(STORAGE_KEYS[type.toUpperCase()], JSON.stringify(data));
        localStorage.setItem(STORAGE_KEYS.TIMESTAMP, Date.now().toString());
    } catch (error) {
        console.warn('Error writing to cache:', error);
    }
};

/**
 * Parse sheet row data into inventory item object
 * @param {Array} row - Row data from Google Sheets
 * @returns {Object} Inventory item object
 */
const parseInventoryRow = (row) => {
    // Handle potentially missing values in the row
    const safeRow = Array.isArray(row) ? row : [];

    return {
        id: safeRow[INVENTORY_COLUMNS.ID] || generateId(),
        name: safeRow[INVENTORY_COLUMNS.NAME] || '',
        category: safeRow[INVENTORY_COLUMNS.CATEGORY] || '',
        sku: safeRow[INVENTORY_COLUMNS.SKU] || '',
        price: parseFloat(safeRow[INVENTORY_COLUMNS.PRICE]) || 0,
        costPrice: parseFloat(safeRow[INVENTORY_COLUMNS.COST_PRICE]) || 0,
        quantity: parseInt(safeRow[INVENTORY_COLUMNS.QUANTITY], 10) || 0,
        lowStockThreshold: parseInt(safeRow[INVENTORY_COLUMNS.LOW_STOCK_THRESHOLD], 10) || 5,
        imageUrl: safeRow[INVENTORY_COLUMNS.IMAGE_URL] || ''
    };
};

/**
 * Generate a unique ID for new items
 * @returns {string} Unique ID
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * Perform an API request with retry logic
 * @param {Function} apiCall - The API call function to execute
 * @param {number} retries - Number of retries (default: 2)
 * @returns {Promise} Promise that resolves with the API response
 */
const performWithRetry = async (apiCall, retries = 2) => {
    try {
        return await apiCall();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }
        
        console.warn(`API call failed, retrying... (${retries} attempts left)`, error);
        
        // Check if we need to reinitialize the API
        if (error.status === 401 || error.status === 403) {
            isInitialized = false;
            initializationPromise = null;
            await initGoogleAPI();
        }
        
        // Exponential backoff
        const delay = 1000 * (3 - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return performWithRetry(apiCall, retries - 1);
    }
};

/**
 * Get all inventory items
 * @param {boolean} forceRefresh - Whether to force refresh from API
 * @returns {Promise<Array>} Array of inventory items
 */
export const getInventory = async (forceRefresh = false) => {
    // Try to get cached data first
    if (!forceRefresh) {
        const cachedData = getCachedData('inventory');
        if (cachedData) {
            console.log('Using cached inventory data');
            return cachedData;
        }
    }
    
    try {
        // Ensure API is initialized
        if (!isInitialized) {
            await initGoogleAPI();
        }

        const response = await performWithRetry(() => 
            window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: INVENTORY_SHEET_RANGE
            })
        );

        const rows = response.result.values || [];
        const inventoryData = rows.map(row => parseInventoryRow(row));
        
        // Cache the data for future use
        cacheData('inventory', inventoryData);
        
        return inventoryData;
    } catch (error) {
        console.error("Failed to fetch inventory from Google Sheets:", error);
        
        // Try to use cached data even if it's expired
        const cachedData = getCachedData('inventory');
        if (cachedData) {
            console.log('Using expired cached inventory data due to API failure');
            return cachedData;
        }
        
        // If no cached data, return empty array
        console.warn('No cached inventory data available, returning empty array');
        return [];
    }
};

/**
 * Get all sales records
 * @param {boolean} forceRefresh - Whether to force refresh from API
 * @returns {Promise<Array>} Array of sales records
 */
export const getSales = async (forceRefresh = false) => {
    // Try to get cached data first
    if (!forceRefresh) {
        const cachedData = getCachedData('sales');
        if (cachedData) {
            console.log('Using cached sales data');
            return cachedData;
        }
    }
    
    try {
        // Ensure API is initialized
        if (!isInitialized) {
            await initGoogleAPI();
        }

        const response = await performWithRetry(() => 
            window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: SALES_SHEET_RANGE
            })
        );

        const rows = response.result.values || [];
        const salesData = rows.map(row => ({
            id: row[0] || '',
            itemId: row[1] || '',
            itemName: row[2] || '',
            quantity: parseInt(row[3], 10) || 0,
            unitPrice: parseFloat(row[4]) || 0,
            totalPrice: parseFloat(row[5]) || 0,
            timestamp: row[6] || new Date().toISOString()
        }));
        
        // Cache the data for future use
        cacheData('sales', salesData);
        
        return salesData;
    } catch (error) {
        console.error("Failed to fetch sales from Google Sheets:", error);
        
        // Try to use cached data even if it's expired
        const cachedData = getCachedData('sales');
        if (cachedData) {
            console.log('Using expired cached sales data due to API failure');
            return cachedData;
        }
        
        // If no cached data, return empty array
        console.warn('No cached sales data available, returning empty array');
        return [];
    }
};

/**
 * For static exports, we can't modify the Google Sheet directly
 * These functions are kept as stubs that trigger a notification
 * In a real app, you might collect these changes and sync them later
 */

export const addItem = async (item) => {
    console.warn('Write operations not supported in static export mode');
    alert('Adding items is not available in the static version. This would normally be saved to Google Sheets.');
    return { ...item, id: item.id || generateId() };
};

export const updateItem = async (item) => {
    console.warn('Write operations not supported in static export mode');
    alert('Updating items is not available in the static version. This would normally update Google Sheets.');
    return item;
};

export const deleteItem = async (id) => {
    console.warn('Write operations not supported in static export mode');
    alert('Deleting items is not available in the static version. This would normally delete from Google Sheets.');
    return { id };
};

export const recordSale = async (item, quantity) => {
    console.warn('Write operations not supported in static export mode');
    alert('Recording sales is not available in the static version. This would normally be saved to Google Sheets.');
    
    const saleRecord = {
        id: generateId(),
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: item.price,
        totalPrice: item.price * quantity,
        timestamp: new Date().toISOString()
    };
    
    return saleRecord;
};