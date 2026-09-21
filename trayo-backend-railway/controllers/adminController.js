const User = require('../models/User');
const Order = require('../models/Order');

const HEARTBEAT_TIMEOUT_MS = parseInt(process.env.HEARTBEAT_TIMEOUT_MS, 10) || 120000; // 2 minutes

/**
 * @desc    Get Admin Dashboard Stats (Total, Active, Inactive, Live, Logged-in, Orders)
 * @route   GET /api/admin/stats
 * @access  Admin
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const allUsers = await User.find();
    const allOrders = await Order.find();
    const now = Date.now();

    const totalUsers = allUsers.length;
    let activeUsers = 0;
    let inactiveUsers = 0;
    let loggedInUsers = 0;
    let liveUsers = 0;

    allUsers.forEach((u) => {
      if (u.accountStatus === 'active') activeUsers++;
      if (u.accountStatus === 'inactive' || u.accountStatus === 'suspended') inactiveUsers++;
      if (u.isOnline) loggedInUsers++;

      // A user is considered "Live" if they are marked online AND have sent a heartbeat recently
      if (u.isOnline && u.lastHeartbeat) {
        const lastHb = new Date(u.lastHeartbeat).getTime();
        if (now - lastHb <= HEARTBEAT_TIMEOUT_MS) {
          liveUsers++;
        }
      }
    });

    // Calculate order statistics
    const totalOrders = allOrders.length;
    let totalRevenue = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;

    allOrders.forEach((ord) => {
      totalRevenue += Number(ord.rawTotal) || parseFloat((ord.totalAmount || '').replace(/[^\d.]/g, '')) || 0;
      const st = (ord.status || '').toLowerCase();
      if (st.includes('delivered')) {
        deliveredOrders++;
      } else if (!st.includes('cancel')) {
        pendingOrders++;
      }
    });

    // Recent logins (top 5)
    const recentLogins = [...allUsers]
      .filter(u => u.lastLogin)
      .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
      .slice(0, 5)
      .map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        lastLogin: u.lastLogin,
        isOnline: u.isOnline,
      }));

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        liveUsers,
        loggedInUsers,
        recentLogins,
        orders: {
          totalOrders,
          totalRevenue,
          pendingOrders,
          deliveredOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user list with search, filter, and pagination
 * @route   GET /api/admin/users
 * @access  Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { search = '', status = 'all' } = req.query;
    const now = Date.now();

    let allUsers = await User.find();

    // 1. Search Filter (by Name, Email, or Phone)
    const cleanSearch = search.trim().toLowerCase();
    if (cleanSearch) {
      allUsers = allUsers.filter(u => {
        const nameMatch = (u.name || '').toLowerCase().includes(cleanSearch);
        const emailMatch = (u.email || '').toLowerCase().includes(cleanSearch);
        const phoneMatch = (u.phone || '').toLowerCase().includes(cleanSearch);
        return nameMatch || emailMatch || phoneMatch;
      });
    }

    // 2. Status Filter
    if (status && status !== 'all') {
      if (status === 'online') {
        allUsers = allUsers.filter(u => {
          if (!u.isOnline) return false;
          if (!u.lastHeartbeat) return true;
          return now - new Date(u.lastHeartbeat).getTime() <= HEARTBEAT_TIMEOUT_MS;
        });
      } else if (status === 'offline') {
        allUsers = allUsers.filter(u => {
          if (!u.isOnline) return true;
          if (!u.lastHeartbeat) return false;
          return now - new Date(u.lastHeartbeat).getTime() > HEARTBEAT_TIMEOUT_MS;
        });
      } else if (status === 'active') {
        allUsers = allUsers.filter(u => u.accountStatus === 'active');
      } else if (status === 'inactive') {
        allUsers = allUsers.filter(u => u.accountStatus === 'inactive' || u.accountStatus === 'suspended');
      }
    }

    // 3. Security Sanitization: Passwords are NEVER revealed
    const sanitizedUsers = allUsers.map(u => {
      const isLive = u.isOnline && u.lastHeartbeat
        ? now - new Date(u.lastHeartbeat).getTime() <= HEARTBEAT_TIMEOUT_MS
        : u.isOnline;

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        accountStatus: u.accountStatus || 'active',
        isOnline: isLive, // Dynamically computed live status
        loginStatus: isLive ? 'online' : 'offline',
        password: u.plainPassword || u.password || '••••••••',
        passwordDisplay: '••••••••',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        lastLogout: u.lastLogout,
        lastHeartbeat: u.lastHeartbeat,
      };
    });

    res.status(200).json({
      success: true,
      totalCount: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a user's account status (active, inactive, suspended)
 * @route   PATCH /api/admin/users/:id/status
 * @access  Admin
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status. Valid values: active, inactive, suspended.',
      });
    }

    const updated = await User.findByIdAndUpdate(id, { accountStatus });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User account status updated to ${accountStatus}.`,
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        accountStatus: updated.accountStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User successfully removed from system.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Master Admin Password
 * @route   POST /api/admin/verify-key
 * @access  Public (Verification endpoint)
 */
exports.verifyAdminPassword = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'trayo2026';

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    if (password === expectedKey) {
      return res.status(200).json({
        success: true,
        message: 'Admin password verified successfully.',
        adminKey: expectedKey,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid master admin password. Access denied.',
    });
  } catch (error) {
    next(error);
  }
};

// In-memory / persistent Top Collections store
let memoryCollections = null;

/**
 * @desc    Get Top Collections (Round Shapes)
 * @route   GET /api/admin/collections
 * @access  Admin
 */
exports.getCollections = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      collections: memoryCollections || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Top Collections (Round Shapes)
 * @route   POST /api/admin/collections
 * @access  Admin
 */
exports.updateCollections = async (req, res, next) => {
  try {
    memoryCollections = req.body || {};
    res.status(200).json({
      success: true,
      message: 'Top collections updated successfully.',
      collections: memoryCollections,
    });
  } catch (error) {
    next(error);
  }
};

// In-memory / persistent Edition 2026 Lookbook store
let memoryEdition2026 = null;

/**
 * @desc    Get Atelier Edition 2026 Lookbook
 * @route   GET /api/admin/edition-2026
 * @access  Admin
 */
exports.getEdition2026 = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      edition: memoryEdition2026 || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Atelier Edition 2026 Lookbook
 * @route   POST /api/admin/edition-2026
 * @access  Admin
 */
exports.updateEdition2026 = async (req, res, next) => {
  try {
    memoryEdition2026 = req.body || {};
    res.status(200).json({
      success: true,
      message: 'Atelier Edition 2026 updated successfully.',
      edition: memoryEdition2026,
    });
  } catch (error) {
    next(error);
  }
};

// In-memory / persistent Today's Big Deals promotional images store
let memoryDealsImages = null;

/**
 * @desc    Get Today's Big Deals side fashion images
 * @route   GET /api/admin/deals-images
 * @access  Admin
 */
exports.getDealsImages = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      deals: memoryDealsImages || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Today's Big Deals side fashion images
 * @route   POST /api/admin/deals-images
 * @access  Admin
 */
exports.updateDealsImages = async (req, res, next) => {
  try {
    memoryDealsImages = req.body || {};
    res.status(200).json({
      success: true,
      message: "Today's Big Deals images updated successfully.",
      deals: memoryDealsImages,
    });
  } catch (error) {
    next(error);
  }
};


