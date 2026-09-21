const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User Registration
router.post('/signup', authController.signup);

// User Login
router.post('/login', authController.login);

// User Logout
router.post('/logout', authController.logout);

// Heartbeat Keep-Alive Ping
router.post('/heartbeat', authController.heartbeat);

// Tab Close / Leave Ping
router.post('/leave', authController.leave);

// Current User Profile
router.get('/me', authController.getMe);

// Update User Profile (Bio, Name, Photo, Address)
router.put('/profile', authController.updateProfile);
router.post('/profile', authController.updateProfile);

module.exports = router;
