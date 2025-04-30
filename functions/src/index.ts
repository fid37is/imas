import functions from "firebase-functions";
import express from "express";
import cors from "cors";

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Example route
app.get("/", (req, res) => {
    res.status(200).send("Hello from Firebase Functions (modular structure)!");
});

// Add more routes or import routes from other files as needed

// Export the API as an HTTPS Cloud Function
exports.api = functions.https.onRequest(app);
