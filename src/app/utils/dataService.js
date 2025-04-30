// utils/dataService.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase'; 

const functions = getFunctions(app);

// Functions for Google Sheets operations
const getInventoryFromSheets = httpsCallable(functions, 'getInventoryFromSheets');
const addInventoryItemToSheets = httpsCallable(functions, 'addInventoryItemToSheets');
const updateInventoryItemInSheets = httpsCallable(functions, 'updateInventoryItemInSheets');
const deleteInventoryItemFromSheets = httpsCallable(functions, 'deleteInventoryItemFromSheets');
const recordSaleInSheets = httpsCallable(functions, 'recordSaleInSheets');
const getSalesFromSheets = httpsCallable(functions, 'getSalesFromSheets');

/**
 * Get all inventory items from Google Sheets
 */
export const getInventory = async () => {
    try {
        const result = await getInventoryFromSheets();
        return result.data || [];
    } catch (error) {
        console.error('Error getting inventory:', error);
        throw error;
    }
};

/**
 * Get all sales records from Google Sheets
 */
export const getSales = async () => {
    try {
        const result = await getSalesFromSheets();
        return result.data || [];
    } catch (error) {
        console.error('Error getting sales data:', error);
        throw error;
    }
};

/**
 * Add a new inventory item to Google Sheets
 */
export const addItem = async (itemData) => {
    try {
        const result = await addInventoryItemToSheets(itemData);
        return result.data;
    } catch (error) {
        console.error('Error adding item:', error);
        throw error;
    }
};

/**
 * Update an existing inventory item in Google Sheets
 */
export const updateItem = async (itemData) => {
    try {
        await updateInventoryItemInSheets(itemData);
        return { success: true };
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
};

/**
 * Delete an inventory item from Google Sheets
 */
export const deleteItem = async (itemId) => {
    try {
        await deleteInventoryItemFromSheets({ id: itemId });
        return { success: true };
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
};

/**
 * Record a sale in Google Sheets and update inventory
 */
export const recordSale = async (item, quantity) => {
    try {
        // Calculate new quantity after sale
        const newQuantity = item.quantity - quantity;

        if (newQuantity < 0) {
            throw new Error('Not enough items in stock');
        }

        // Record the sale
        const saleData = {
            itemId: item.id,
            itemName: item.name,
            quantity: quantity,
            price: item.price,
            newQuantity: newQuantity // Pass new quantity for inventory update
        };

        const result = await recordSaleInSheets(saleData);
        return result.data;
    } catch (error) {
        console.error('Error recording sale:', error);
        throw error;
    }
};