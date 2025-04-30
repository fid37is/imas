import { https } from "firebase-functions";
import express, { json } from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(json());

// Sample route
app.get("/", (req, res) => {
    res.send("Hello from Firebase Functions!");
});

export const api = https.onRequest(app);
