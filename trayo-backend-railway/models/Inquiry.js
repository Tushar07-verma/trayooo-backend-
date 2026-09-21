const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');

// Define Mongoose Inquiry Schema
const inquirySchema = new mongoose.Schema(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'chat', 'general'],
      default: 'email',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      default: 'General Concierge Inquiry',
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'replied', 'closed'],
      default: 'new',
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

const MongooseInquiry = mongoose.model('Inquiry', inquirySchema);

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'inquiries.json');

const ensureDataFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error initializing fallback inquiries store:', err);
  }
};

const readFallbackInquiries = () => {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading fallback inquiries:', e);
    return [];
  }
};

const writeFallbackInquiries = (inquiries) => {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(inquiries, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing fallback inquiries:', e);
  }
};

const UnifiedInquiry = {
  isMongoActive() {
    return getIsConnected();
  },

  async create(data) {
    if (UnifiedInquiry.isMongoActive()) {
      return await MongooseInquiry.create(data);
    }
    const inquiries = readFallbackInquiries();
    const newInquiry = {
      _id: 'inq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      inquiryId: data.inquiryId || '#INQ-' + Math.floor(100000 + Math.random() * 900000),
      channel: data.channel || 'email',
      name: data.name || 'Customer',
      email: data.email || 'guest@trayo.atelier',
      phone: data.phone || '',
      subject: data.subject || 'General Concierge Inquiry',
      message: data.message || '',
      status: data.status || 'new',
      userId: data.userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inquiries.unshift(newInquiry);
    writeFallbackInquiries(inquiries);
    return newInquiry;
  },

  async find(filter = {}) {
    if (UnifiedInquiry.isMongoActive()) {
      return await MongooseInquiry.find(filter).sort({ createdAt: -1 });
    }
    const inquiries = readFallbackInquiries();
    return inquiries;
  },

  async findByIdAndUpdate(id, updates) {
    if (UnifiedInquiry.isMongoActive()) {
      return await MongooseInquiry.findByIdAndUpdate(id, updates, { new: true });
    }
    const inquiries = readFallbackInquiries();
    const idx = inquiries.findIndex(i => i._id === id || i.inquiryId === id);
    if (idx === -1) return null;
    inquiries[idx] = {
      ...inquiries[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeFallbackInquiries(inquiries);
    return inquiries[idx];
  },
};

module.exports = UnifiedInquiry;
