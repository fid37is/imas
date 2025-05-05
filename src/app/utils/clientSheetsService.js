// src/app/utils/clientSheetsService.js

// Add row to Google Sheet via API route
export const addRowToSheet = async (sheetId, range, values) => {
    try {
        const response = await fetch('/api/sheets/addRow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sheetId, range, values }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add row to sheet');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error adding row to sheet:', error);
        throw error;
    }
};

// Get rows from Google Sheet via API route
export const getRowsFromSheet = async (sheetId, range) => {
    try {
        const params = new URLSearchParams({ sheetId, range });
        const response = await fetch(`/api/sheets/getRows?${params.toString()}`, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get rows from sheet');
        }

        const data = await response.json();
        return data.rows;
    } catch (error) {
        console.error('Error getting rows from sheet:', error);
        throw error;
    }
};

// Update row in Google Sheet via API route
export const updateRowInSheet = async (sheetId, range, values) => {
    try {
        const response = await fetch('/api/sheets/updateRow', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sheetId, range, values }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update row in sheet');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error updating row in sheet:', error);
        throw error;
    }
};