// Directory: /pages/api/items/index.js
import { getItems, addItemToSheet } from '../../../src/app/utils/googleSheetsService';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const items = await getItems();
            return res.status(200).json(items);
        }

        if (req.method === 'POST') {
            const item = req.body;
            const result = await addItemToSheet(item);
            return res.status(201).json(result);
        }

        res.status(405).end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
