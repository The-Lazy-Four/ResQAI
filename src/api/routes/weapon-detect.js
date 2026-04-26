// ============================================================
// Weapon Detection Proxy — Roboflow API (server-side, no CORS)
// Model: weapon-detection-ssvfk/1  |  mAP 99.4%
// ============================================================

import express from 'express';
const router = express.Router();

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY; // Requires ROBOFLOW_API_KEY in .env
const ROBOFLOW_MODEL   = 'weapon-detection-ssvfk/1';
const ROBOFLOW_URL     = `https://detect.roboflow.com/${ROBOFLOW_MODEL}`;

router.post('/detect', async (req, res) => {
    try {
        const { image_b64 } = req.body;
        if (!image_b64) return res.status(400).json({ error: 'image_b64 required' });

        // Strip data URL prefix if present
        const base64Data = image_b64.includes(',') ? image_b64.split(',')[1] : image_b64;

        const response = await fetch(`${ROBOFLOW_URL}?api_key=${ROBOFLOW_API_KEY}&confidence=40&overlap=30`, {
            method: 'POST',
            body: base64Data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[WeaponDetect] Roboflow error:', response.status, errText);
            return res.status(502).json({ error: 'Roboflow error: ' + response.status, predictions: [] });
        }

        const data = await response.json();
        // Roboflow returns: { predictions: [{class, confidence, x, y, width, height}] }
        return res.json({
            predictions: data.predictions || [],
            image: data.image || {}
        });

    } catch (err) {
        console.error('[WeaponDetect]', err.message);
        return res.status(500).json({ error: err.message, predictions: [] });
    }
});

export default router;
