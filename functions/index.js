// functions/src/index.js

const admin = ('firebase-admin');
admin.initializeApp();

// Export all Google Sheet functions
const sheetFunctions = ('./sheetsService');
exports.getInventory = sheetFunctions.getInventory;
exports.addInventoryItem = sheetFunctions.addInventoryItem;
exports.updateInventoryItem = sheetFunctions.updateInventoryItem;
exports.deleteInventoryItem = sheetFunctions.deleteInventoryItem;
exports.recordSale = sheetFunctions.recordSale;
exports.getSales = sheetFunctions.getSales;

// Export Google Drive functions
const driveFunctions = ('./driveService');
exports.uploadImageToDrive = driveFunctions.uploadImageToDrive;