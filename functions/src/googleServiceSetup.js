// functions/src/googleServiceSetup.js

const { google } = ('googleapis');
const functions = ('firebase-functions');

// Get these values from your Google Cloud console
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
];

// Your service account credentials
const SERVICE_ACCOUNT = {
    "type": "service_account",
    "project_id": functions.config().google.project_id,
    "private_key_id": functions.config().google.private_key_id,
    "private_key": functions.config().google.private_key.replace(/\\n/g, '\n'),
    "client_email": functions.config().google.client_email,
    "client_id": functions.config().google.client_id,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": functions.config().google.client_cert_url
};

// Folder ID where you want to store inventory images
const DRIVE_FOLDER_ID = functions.config().google.drive_folder_id;
// Spreadsheet ID where you store inventory data
const SHEET_ID = functions.config().google.sheet_id;

// Authorization function
const authorize = () => {
    const jwtClient = new google.auth.JWT(
        SERVICE_ACCOUNT.client_email,
        null,
        SERVICE_ACCOUNT.private_key,
        SCOPES
    );
    return jwtClient;
};

// Get Google Drive instance
const getDrive = () => {
    const auth = authorize();
    return google.drive({ version: 'v3', auth });
};

// Get Google Sheets instance
const getSheets = () => {
    const auth = authorize();
    return google.sheets({ version: 'v4', auth });
};

module.exports = {
    getDrive,
    getSheets,
    DRIVE_FOLDER_ID,
    SHEET_ID
};