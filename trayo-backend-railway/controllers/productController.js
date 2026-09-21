const Product = require('../models/Product');

/**
 * @desc    Get all products with filtering & search
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, stock } = req.query;
    let filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }
    if (stock === 'instock') {
      filter.inStock = true;
    } else if (stock === 'outofstock') {
      filter.inStock = false;
    }

    let products = await Product.find(filter);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.desc && p.desc.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
        (p.tag && p.tag.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Admin
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      categoryLabel,
      priceINR,
      comparePriceINR,
      tag,
      image,
      fallbackImage,
      images,
      sizes,
      colors,
      desc,
      inStock,
    } = req.body;

    if (!name || !priceINR) {
      return res.status(400).json({
        success: false,
        message: 'Product title and price (INR) are required.',
      });
    }

    const numericPrice = parseFloat(priceINR) || 0;
    const numericCompare = parseFloat(comparePriceINR) || Math.round(numericPrice * 1.5);
    const discountPct = numericCompare > numericPrice
      ? Math.round(((numericCompare - numericPrice) / numericCompare) * 100)
      : 0;

    const newProduct = await Product.create({
      name: name.trim(),
      category: (category || 'unique').trim().toLowerCase(),
      categoryLabel: categoryLabel || 'Streetwear',
      priceINR: numericPrice,
      comparePriceINR: numericCompare,
      discountPct,
      tag: tag || 'Trending',
      image: image || 'images/hero-1.jpg',
      fallbackImage: fallbackImage || image || 'images/hero-1.jpg',
      images: Array.isArray(images) && images.length > 0 ? images : [image || 'images/hero-1.jpg'],
      sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
      colors: Array.isArray(colors) && colors.length > 0 ? colors : [{ name: 'Onyx Black', hex: '#111111' }],
      desc: (desc || '').trim(),
      inStock: inStock !== undefined ? !!inStock : true,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing product
 * @route   PUT /api/products/:id
 * @access  Admin
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.priceINR !== undefined) {
      updates.priceINR = parseFloat(updates.priceINR) || 0;
      if (updates.comparePriceINR) {
        updates.comparePriceINR = parseFloat(updates.comparePriceINR) || 0;
        if (updates.comparePriceINR > updates.priceINR) {
          updates.discountPct = Math.round(((updates.comparePriceINR - updates.priceINR) / updates.comparePriceINR) * 100);
        }
      }
    }

    const updated = await Product.findByIdAndUpdate(id, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle product inStock / outOfStock status
 * @route   PATCH /api/products/:id/stock
 * @access  Admin
 */
exports.toggleStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const currentStock = product.inStock !== false;
    const newStock = req.body.inStock !== undefined ? !!req.body.inStock : !currentStock;

    const updated = await Product.findByIdAndUpdate(id, { inStock: newStock });

    res.status(200).json({
      success: true,
      message: `Product stock status updated to ${newStock ? 'In Stock' : 'Out of Stock'}`,
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
