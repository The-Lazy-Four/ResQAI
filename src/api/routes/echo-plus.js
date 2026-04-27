import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqai-secret-key-change-in-production';
const ECHO_ADMIN_PASSWORD = process.env.ECHO_ADMIN_PASSWORD || 'echo2024';

router.post('/admin-login', (req, res) => {
  try {
    const { password } = req.body || {};

    if (!password || password !== ECHO_ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'echo-admin' }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      expiresIn: '7d'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
