const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');

// Define Mongoose Order Schema
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    time: {
      type: String,
      default: () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    },
    customer: {
      fullName: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      address: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      fullAddress: { type: String, default: '' },
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
    },
    productImage: {
      type: String,
      default: 'images/hero-1.jpg',
    },
    size: {
      type: String,
      default: 'M',
    },
    color: {
      type: String,
      default: 'Onyx Black',
    },
    qty: {
      type: Number,
      default: 1,
      min: 1,
    },
    unitPrice: {
      type: String,
      default: '₹2,999',
    },
    totalAmount: {
      type: String,
      required: [true, 'Total amount is required'],
    },
    rawTotal: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: 'Online Payment (UPI)',
    },
    transactionId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'New',
    },
    userId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseOrder = mongoose.model('Order', orderSchema);

// ============================================================================
// RESILIENT FALLBACK STORAGE
// Stores orders in backend/data/orders.json if MongoDB is not connected.
// ============================================================================
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

const sampleInitialOrders = [
  {
    _id: 'ord_sample_1',
    orderId: '#TRY-782910',
    date: '18 Sep 2026',
    time: '06:45 PM',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    customer: {
      fullName: 'Aryan Sharma',
      mobile: '9876543210',
      email: 'aryan.sharma@gmail.com',
      address: 'B-402, High Street Residences',
      area: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      fullAddress: 'B-402, High Street Residences, Bandra West, Mumbai, Maharashtra - 400050'
    },
    productName: 'T-RAYO Arachnid Heavyweight Hoodie',
    productImage: 'images/hero-1.jpg',
    size: 'L',
    color: 'Onyx Black',
    qty: 1,
    unitPrice: '₹4,999',
    totalAmount: '₹4,999',
    rawTotal: 4999,
    paymentMethod: 'Online UPI (GPay)',
    transactionId: 'TXN-984210',
    status: 'Dispatched • In Transit',
    userId: 'usr_demo_1'
  },
  {
    _id: 'ord_sample_2',
    orderId: '#TRY-872134',
    date: '18 Sep 2026',
    time: '02:30 PM',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    customer: {
      fullName: 'Priya Patel',
      mobile: '9823456789',
      email: 'priya.patel@gmail.com',
      address: 'Plot 12, Gulmohar Avenue',
      area: 'Koregaon Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      fullAddress: 'Plot 12, Gulmohar Avenue, Koregaon Park, Pune, Maharashtra - 411001'
    },
    productName: 'Avant-Garde Washed Charcoal Boxy Fleece',
    productImage: 'images/hero-2.jpg',
    size: 'M',
    color: 'Washed Charcoal',
    qty: 1,
    unitPrice: '₹3,799',
    totalAmount: '₹3,799',
    rawTotal: 3799,
    paymentMethod: 'Cash on Delivery (COD)',
    transactionId: 'COD-REF-8721',
    status: 'Confirmed • Express Air Shipping',
    userId: null
  }
];

const ensureDataFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(sampleInitialOrders, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error initializing fallback orders store:', err);
  }
};

const readFallbackOrders = () => {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return sampleInitialOrders;
  }
};

const writeFallbackOrders = (orders) => {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write fallback orders:', err);
  }
};

// Unified Order interface supporting both Mongoose and File Fallback
const UnifiedOrder = {
  isMongoActive() {
    return Boolean(getIsConnected() && mongoose.connection.readyState === 1);
  },

  async find(query = {}) {
    if (UnifiedOrder.isMongoActive()) {
      return await MongooseOrder.find(query).sort({ createdAt: -1 });
    }
    const orders = readFallbackOrders();
    return orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  async findById(id) {
    if (UnifiedOrder.isMongoActive()) {
      return await MongooseOrder.findById(id);
    }
    const orders = readFallbackOrders();
    return orders.find(o => o._id === id || o.orderId === id) || null;
  },

  async create(orderData) {
    if (UnifiedOrder.isMongoActive()) {
      return await MongooseOrder.create(orderData);
    }
    const orders = readFallbackOrders();
    const newDoc = {
      _id: 'ord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      ...orderData,
      createdAt: orderData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.unshift(newDoc);
    writeFallbackOrders(orders);
    return newDoc;
  },

  async findByIdAndUpdate(id, updates) {
    if (UnifiedOrder.isMongoActive()) {
      return await MongooseOrder.findByIdAndUpdate(id, updates, { new: true });
    }
    const orders = readFallbackOrders();
    const idx = orders.findIndex(o => o._id === id || o.orderId === id);
    if (idx === -1) return null;
    orders[idx] = {
      ...orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeFallbackOrders(orders);
    return orders[idx];
  },

  async findByIdAndDelete(id) {
    if (UnifiedOrder.isMongoActive()) {
      return await MongooseOrder.findByIdAndDelete(id);
    }
    const orders = readFallbackOrders();
    const idx = orders.findIndex(o => o._id === id || o.orderId === id);
    if (idx === -1) return null;
    const deleted = orders.splice(idx, 1)[0];
    writeFallbackOrders(orders);
    return deleted;
  }
};

const VALID_ORDER_STATUSES = [
  'New',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancel order',
  'Return',
  'Exchange',
  'Refund',
  'Partial refund',
];

UnifiedOrder.VALID_ORDER_STATUSES = VALID_ORDER_STATUSES;

module.exports = UnifiedOrder;
module.exports.VALID_ORDER_STATUSES = VALID_ORDER_STATUSES;

