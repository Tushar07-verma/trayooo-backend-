const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const adminAuth = require('../middleware/adminAuth');

// Master Password Verification (Public endpoint to unlock portal)
router.post('/verify-key', adminController.verifyAdminPassword);

// Apply pluggable admin authentication middleware for all protected admin actions
router.use(adminAuth);

// Dashboard Statistics (Total, Active, Inactive, Live, Logged-in)
router.get('/stats', adminController.getDashboardStats);

// User List with Search & Filtering
router.get('/users', adminController.getUsers);

// Update User Account Status (active/inactive/suspended)
router.patch('/users/:id/status', adminController.updateUserStatus);

// Delete User
router.delete('/users/:id', adminController.deleteUser);

// Orders Management
router.get('/orders', orderController.getOrders);
router.patch('/orders/:id/status', orderController.updateOrderStatus);
router.delete('/orders/:id', orderController.deleteOrder);

// Top Collections Management (Round Shapes)
router.get('/collections', adminController.getCollections);
router.post('/collections', adminController.updateCollections);

// Atelier Edition 2026 Lookbook Management
router.get('/edition-2026', adminController.getEdition2026);
router.post('/edition-2026', adminController.updateEdition2026);

// Today's Big Deals Side Fashion Images Management
router.get('/deals-images', adminController.getDealsImages);
router.post('/deals-images', adminController.updateDealsImages);

module.exports = router;


