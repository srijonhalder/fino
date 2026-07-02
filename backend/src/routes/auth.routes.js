const express = require('express');
const router = express.Router();

const { register, login, getMe, logout, walletConnect, walletSignup } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { registerValidation, loginValidation } = require('../middleware/validate.middleware');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/wallet-connect', walletConnect);
router.post('/wallet-signup', walletSignup);

// Protected routes (require JWT)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
