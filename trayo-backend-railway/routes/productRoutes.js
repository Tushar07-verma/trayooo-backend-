const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/stock', productController.toggleStock);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
