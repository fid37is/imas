/* eslint-disable @typescript-eslint/no-unused-vars */
// clientSheetsService.js
// Client-side service to interact with Google Sheets API endpoints

const SHEET_ID = '1QzsXGJm9ouaV8YCIEwfowPn1qOdT-Qe7cjrc-tlIG_8'; // Your Google Sheet ID

// Get rows from a sheet
export const getRowsFromSheet = async (range) => {
    try {
        // First try the new route format
        try {
            const response = await fetch(`/api/sheets/getRows?sheetId=${SHEET_ID}&range=${encodeURIComponent(range)}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.rows || [];
            }
        } catch (e) {
            console.log("First attempt failed, trying alternative route");
        }
        
        // Fall back to the original route format
        const response = await fetch(`/api/sheets?sheetId=${SHEET_ID}&range=${encodeURIComponent(range)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.rows || [];
    } catch (error) {
        console.error('Error getting rows from sheet:', error);
        throw error; // Re-throw the error instead of returning mock data
    }
};

// Add a row to a sheet
export const addRowToSheet = async (range, values) => {
    try {
        // First try the new route format
        try {
            const response = await fetch('/api/sheets/addRow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sheetId: SHEET_ID,
                    range,
                    values,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.result;
            }
        } catch (e) {
            console.log("First attempt failed, trying alternative route");
        }
        
        // Fall back to the original route format
        const response = await fetch('/api/sheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sheetId: SHEET_ID,
                range,
                values,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error adding row to sheet:', error);
        throw error; // Re-throw the error instead of returning mock success
    }
};

// Update a row in a sheet
export const updateRowInSheet = async (range, values) => {
    try {
        // First try the new route format
        try {
            const response = await fetch('/api/sheets/updateRow', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sheetId: SHEET_ID,
                    range,
                    values,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.result;
            }
        } catch (e) {
            console.log("First attempt failed, trying alternative route");
        }
        
        // Fall back to the original route format
        const response = await fetch('/api/sheets', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sheetId: SHEET_ID,
                range,
                values,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error updating row in sheet:', error);
        throw error; // Re-throw the error instead of returning mock success
    }
};

// Delete a row from a sheet
export const deleteRowFromSheet = async (sheetName, rowIndex) => {
    try {
        // First try the new route format
        try {
            const response = await fetch('/api/sheets/deleteRow', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sheetId: SHEET_ID,
                    sheetName,
                    rowIndex,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.result;
            }
        } catch (e) {
            console.log("First attempt failed, trying alternative route");
        }
        
        // Fall back to the original route format
        const response = await fetch('/api/sheets/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sheetId: SHEET_ID,
                sheetName,
                rowIndex,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error deleting row from sheet:', error);
        throw error; // Re-throw the error instead of returning mock success
    }
};