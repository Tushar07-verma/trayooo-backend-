const Order = require('../models/Order');

/**
 * @desc    Get all orders (with search and status filter)
 * @route   GET /api/orders, GET /api/admin/orders
 * @access  Public / Admin
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { search = '', status = 'all' } = req.query;

    let orders = await Order.find();

    // 1. Search Filter (by Order ID, Customer Name, Mobile, Email, or City)
    const cleanSearch = search.trim().toLowerCase();
    if (cleanSearch) {
      orders = orders.filter(ord => {
        const orderIdMatch = (ord.orderId || '').toLowerCase().includes(cleanSearch);
        const nameMatch = (ord.customer?.fullName || '').toLowerCase().includes(cleanSearch);
        const mobileMatch = (ord.customer?.mobile || '').toLowerCase().includes(cleanSearch);
        const emailMatch = (ord.customer?.email || '').toLowerCase().includes(cleanSearch);
        const cityMatch = (ord.customer?.city || '').toLowerCase().includes(cleanSearch);
        const prodMatch = (ord.productName || '').toLowerCase().includes(cleanSearch);
        return orderIdMatch || nameMatch || mobileMatch || emailMatch || cityMatch || prodMatch;
      });
    }

    // 2. Status Filter
    if (status && status !== 'all') {
      const cleanStatus = status.toLowerCase();
      orders = orders.filter(ord => {
        const curStatus = (ord.status || '').toLowerCase();
        return curStatus.includes(cleanStatus);
      });
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create / Place a new order
 * @route   POST /api/orders
 * @access  Public
 */
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderId,
      date,
      time,
      customer,
      productName,
      productImage,
      size,
      color,
      qty,
      unitPrice,
      totalAmount,
      rawTotal,
      paymentMethod,
      transactionId,
      status,
      userId,
    } = req.body;

    if (!orderId || !customer || !productName || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Customer information, Product Name, and Total Amount are required.',
      });
    }

    // Build customer object with full address
    const fullAddress = customer.fullAddress || [
      customer.address,
      customer.area,
      customer.city,
      customer.state ? `${customer.state} - ${customer.pincode}` : customer.pincode
    ].filter(Boolean).join(', ');

    const newOrder = await Order.create({
      orderId,
      date: date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      createdAt: new Date().toISOString(),
      customer: {
        fullName: customer.fullName || 'Customer',
        mobile: customer.mobile || '',
        email: customer.email || '',
        address: customer.address || '',
        area: customer.area || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        fullAddress,
      },
      productName,
      productImage: productImage || 'images/hero-1.jpg',
      size: size || 'M',
      color: color || 'Onyx Black',
      qty: Number(qty) || 1,
      unitPrice: unitPrice || totalAmount,
      totalAmount,
      rawTotal: Number(rawTotal) || 0,
      paymentMethod: paymentMethod || 'Online Payment',
      transactionId: transactionId || '',
      status: status || 'New',
      userId: userId || null,
    });

    res.status(201).json({
      success: true,
      message: 'Order recorded successfully',
      order: newOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:id/status, PATCH /api/admin/orders/:id/status
 * @access  Admin
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Order status is required',
      });
    }

    const updated = await Order.findByIdAndUpdate(id, { status });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete order
 * @route   DELETE /api/orders/:id, DELETE /api/admin/orders/:id
 * @access  Admin
 */
exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      order: deleted,
    });
  } catch (error) {
    next(error);
  }
};
