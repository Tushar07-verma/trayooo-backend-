const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Get all orders (with search & status filter)
router.get('/', orderController.getOrders);

// Create new order (Storefront checkout)
router.post('/', orderController.createOrder);

// Update order status (Admin update)
router.patch('/:id/status', orderController.updateOrderStatus);

// Delete order (Admin)
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
