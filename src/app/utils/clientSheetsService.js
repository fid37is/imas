
// environmentAwareClientSheetsService.js
// Client-side service to interact with Google Sheets API with environment awareness

// Configure sheet IDs for different environments
const SHEET_CONFIG = {
    development: '1QzsXGJm9ouaV8YCIEwfowPn1qOdT-Qe7cjrc-tlIG_8', 
    production: '1bCL9AQEnHAlLZV8x4eDw4rJg3gREBSYIiiKvCwx2uZw', 
};

// Determine the current environment
const getEnvironment = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Check if we're on a production domain
        if (hostname.includes('vercel.app') || hostname === 'https://imas-ruby.vercel.app') {
            return 'production';
        }
    }
    return 'development';
};

// Get the correct sheet ID for the current environment
const getSheetId = () => {
    const environment = getEnvironment();
    console.log(`Current environment: ${environment}`);
    return SHEET_CONFIG[environment];
};

// Helper for API requests with error handling
const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, options);

    if (!response.ok) {
        // Add more detailed error handling
        const errorText = await response.text().catch(() => 'No error details available');
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
};

// Get rows from a sheet
export const getRowsFromSheet = async (range) => {
    const sheetId = getSheetId();
    console.log(`Fetching from Sheet ID: ${sheetId}, Range: ${range}`);

    try {
        // Try the primary endpoint
        try {
            const data = await apiRequest(`/api/sheets/getRows?sheetId=${sheetId}&range=${encodeURIComponent(range)}`);
            return data.rows || [];
        } catch (e) {
            console.log("Primary endpoint failed:", e.message);
        }

        // Fall back to the alternate endpoint
        const data = await apiRequest(`/api/sheets?sheetId=${sheetId}&range=${encodeURIComponent(range)}`);
        return data.rows || [];
    } catch (error) {
        console.error('Error getting rows from sheet:', error);

        // More detailed debugging info
        if (error.message.includes('500')) {
            console.error('This might be due to invalid credentials or sheet permissions');
        }

        throw error;
    }
};

// Add a row to a sheet
export const addRowToSheet = async (range, values) => {
    const sheetId = getSheetId();
    console.log(`Adding to Sheet ID: ${sheetId}, Range: ${range}`);

    const requestBody = {
        sheetId,
        range,
        values,
    };

    try {
        // Try the primary endpoint
        try {
            const data = await apiRequest('/api/sheets/addRow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            return data.result;
        } catch (e) {
            console.log("Primary endpoint failed:", e.message);
        }

        // Fall back to the alternate endpoint
        const data = await apiRequest('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return data.result;
    } catch (error) {
        console.error('Error adding row to sheet:', error);
        throw error;
    }
};

// Update a row in a sheet
export const updateRowInSheet = async (range, values) => {
    const sheetId = getSheetId();
    console.log(`Updating Sheet ID: ${sheetId}, Range: ${range}`);

    const requestBody = {
        sheetId,
        range,
        values,
    };

    try {
        // Try the primary endpoint
        try {
            const data = await apiRequest('/api/sheets/updateRow', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            return data.result;
        } catch (e) {
            console.log("Primary endpoint failed:", e.message);
        }

        // Fall back to the alternate endpoint
        const data = await apiRequest('/api/sheets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return data.result;
    } catch (error) {
        console.error('Error updating row in sheet:', error);
        throw error;
    }
};

// Delete a row from a sheet
export const deleteRowFromSheet = async (sheetName, rowIndex) => {
    const sheetId = getSheetId();
    console.log(`Deleting from Sheet ID: ${sheetId}, Sheet: ${sheetName}, Row: ${rowIndex}`);

    const requestBody = {
        sheetId,
        sheetName,
        rowIndex,
    };

    try {
        // Try the primary endpoint
        try {
            const data = await apiRequest('/api/sheets/deleteRow', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            return data.result;
        } catch (e) {
            console.log("Primary endpoint failed:", e.message);
        }

        // Fall back to the alternate endpoint
        const data = await apiRequest('/api/sheets/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return data.result;
    } catch (error) {
        console.error('Error deleting row from sheet:', error);
        throw error;
    }
};