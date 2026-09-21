const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');

// Define Mongoose User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Prevents password from leaking in normal queries
    },
    plainPassword: {
      type: String,
      default: '',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastHeartbeat: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    photo: {
      type: String,
      default: '',
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password with bcrypt before saving (Mongoose)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password verification method (Mongoose)
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const MongooseUser = mongoose.model('User', userSchema);

// ============================================================================
// RESILIENT FALLBACK STORAGE
// Enables instant out-of-the-box local testing even if MongoDB is not started.
// Once MongoDB is connected, MongooseUser is seamlessly utilized.
// ============================================================================
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

const ensureDataFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error initializing fallback store:', err);
  }
};

const readFallbackUsers = () => {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
};

const writeFallbackUsers = (users) => {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing fallback store:', e);
  }
};

// Unified Model Adapter
const UnifiedUser = {
  // Check if real MongoDB is active
  isMongoActive: () => getIsConnected(),

  // Create User
  async create(userData) {
    if (UnifiedUser.isMongoActive()) {
      return await MongooseUser.create(userData);
    }

    // Fallback file store implementation
    const users = readFallbackUsers();
    const existing = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      const err = new Error('Email already registered');
      err.code = 11000;
      throw err;
    }

    // Securely hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const now = new Date().toISOString();
    const newUser = {
      _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: (userData.phone || '').trim(),
      password: hashedPassword,
      plainPassword: userData.password || '',
      accountStatus: userData.accountStatus || 'active',
      isOnline: userData.isOnline || false,
      lastHeartbeat: userData.lastHeartbeat || null,
      lastLogin: userData.lastLogin || null,
      lastLogout: userData.lastLogout || null,
      role: userData.role || 'user',
      createdAt: now,
      updatedAt: now,
      async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      },
    };

    users.push(newUser);
    writeFallbackUsers(users);

    // Return sanitized object
    const sanitized = { ...newUser };
    delete sanitized.password;
    return sanitized;
  },

  // Find user by query (supports withPassword flag)
  async findOne(query, withPassword = false) {
    if (UnifiedUser.isMongoActive()) {
      let q = MongooseUser.findOne(query);
      if (withPassword) q = q.select('+password');
      return await q;
    }

    const users = readFallbackUsers();
    const found = users.find(u => {
      let match = true;
      if (query.email && u.email.toLowerCase() !== query.email.toLowerCase()) match = false;
      if (query._id && u._id !== query._id) match = false;
      return match;
    });

    if (!found) return null;

    // Attach comparePassword helper
    const userDoc = {
      ...found,
      async comparePassword(candidate) {
        return await bcrypt.compare(candidate, found.password);
      },
    };

    if (!withPassword) {
      delete userDoc.password;
    }
    return userDoc;
  },

  // Find user by ID
  async findById(id, withPassword = false) {
    return await UnifiedUser.findOne({ _id: id }, withPassword);
  },

  // Find by ID and update
  async findByIdAndUpdate(id, updates) {
    if (UnifiedUser.isMongoActive()) {
      return await MongooseUser.findByIdAndUpdate(id, updates, { new: true });
    }

    const users = readFallbackUsers();
    const idx = users.findIndex(u => u._id === id);
    if (idx === -1) return null;

    users[idx] = {
      ...users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeFallbackUsers(users);
    const sanitized = { ...users[idx] };
    delete sanitized.password;
    return sanitized;
  },

  // Find multiple users with filters
  async find(filter = {}) {
    if (UnifiedUser.isMongoActive()) {
      return await MongooseUser.find(filter).select('+password +plainPassword').sort({ createdAt: -1 });
    }

    let users = readFallbackUsers();
    if (filter.accountStatus) {
      users = users.filter(u => u.accountStatus === filter.accountStatus);
    }
    if (filter.isOnline !== undefined) {
      users = users.filter(u => u.isOnline === filter.isOnline);
    }

    return users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(u => {
        const copy = { ...u };
        delete copy.password; // Do not leak bcrypt hash
        return copy;
      });
  },

  // Count documents
  async countDocuments(filter = {}) {
    if (UnifiedUser.isMongoActive()) {
      return await MongooseUser.countDocuments(filter);
    }
    const found = await UnifiedUser.find(filter);
    return found.length;
  },

  // Delete user by ID
  async findByIdAndDelete(id) {
    if (UnifiedUser.isMongoActive()) {
      return await MongooseUser.findByIdAndDelete(id);
    }
    const users = readFallbackUsers();
    const idx = users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    const deleted = users.splice(idx, 1)[0];
    writeFallbackUsers(users);
    return deleted;
  },
};

module.exports = UnifiedUser;
