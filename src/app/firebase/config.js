import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase for authentication and functions
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Optional: Connect to Functions emulator if in development environment
if (process.env.NODE_ENV === 'development') {
    // Uncomment this if you're using Firebase emulators for local development
    // connectFunctionsEmulator(functions, "localhost", 5001);
}

// Note: Google Drive and Sheets API operations should be performed via server-side API routes
// Client-side usage example (calling your API routes):
const googleDriveService = {
    uploadImage: async (file, folderID = null) => {
        const formData = new FormData();
        formData.append('file', file);
        if (folderID) formData.append('folderID', folderID);
        
        const response = await fetch('/api/drive/upload', {
            method: 'POST',
            body: formData
        });
        
        return response.json();
    },
    
    getImageUrl: async (fileId) => {
        const response = await fetch(`/api/drive/get-url?fileId=${fileId}`);
        return response.json();
    }
};

const googleSheetsService = {
    getInventory: async (spreadsheetId, range) => {
        const response = await fetch(`/api/sheets/get-inventory?spreadsheetId=${spreadsheetId}&range=${range}`);
        return response.json();
    },
    
    updateInventory: async (spreadsheetId, range, values) => {
        const response = await fetch('/api/sheets/update-inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ spreadsheetId, range, values })
        });
        
        return response.json();
    }
};

export { app, auth, functions, googleDriveService, googleSheetsService };