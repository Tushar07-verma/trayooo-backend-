const User = require('../models/User');

// Helper to sanitize user object
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    const now = new Date();
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      password,
      plainPassword: password,
      accountStatus: 'active',
      isOnline: true,
      lastLogin: now,
      lastHeartbeat: now,
    });

    const userObj = sanitizeUser(newUser);

    // Provide a simple token format (can be verified by JWT if jwt secret is set)
    const token = 'trayo_tok_' + Buffer.from(`${userObj._id}:${Date.now()}`).toString('base64');

    res.status(201).json({
      success: true,
      message: 'Account successfully created. Welcome to T-RAYO Atelier!',
      token,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & log in
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Retrieve user including hashed password for verification
    const user = await User.findOne({ email: cleanEmail }, true);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found with this email.',
      });
    }

    // Verify hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact concierge support.',
      });
    }

    const now = new Date();

    // Update live status & lastLogin
    const updatedUser = await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastLogin: now,
      lastHeartbeat: now,
      accountStatus: user.accountStatus === 'inactive' ? 'active' : user.accountStatus,
    });

    const userObj = sanitizeUser(updatedUser || user);
    const token = 'trayo_tok_' + Buffer.from(`${userObj._id}:${Date.now()}`).toString('base64');

    res.status(200).json({
      success: true,
      message: 'Welcome back! Signed in to T-RAYO Atelier.',
      token,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log out user & mark offline
 * @route   POST /api/auth/logout
 * @access  Public
 */
exports.logout = async (req, res, next) => {
  try {
    const { userId, email } = req.body;

    if (userId || email) {
      const filter = userId ? { _id: userId } : { email: (email || '').toLowerCase().trim() };
      const user = await User.findOne(filter);
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          isOnline: false,
          lastLogout: new Date(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Keep-alive heartbeat ping from active client session
 * @route   POST /api/auth/heartbeat
 * @access  Public
 */
exports.heartbeat = async (req, res, next) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(200).json({ success: true, isOnline: false });
    }

    const filter = userId ? { _id: userId } : { email: (email || '').toLowerCase().trim() };
    const user = await User.findOne(filter);

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastHeartbeat: new Date(),
      });
      return res.status(200).json({ success: true, isOnline: true });
    }

    res.status(200).json({ success: true, isOnline: false });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle page unload / tab closed (sendBeacon)
 * @route   POST /api/auth/leave
 * @access  Public
 */
exports.leave = async (req, res, next) => {
  try {
    const { userId, email } = req.body;

    if (userId || email) {
      const filter = userId ? { _id: userId } : { email: (email || '').toLowerCase().trim() };
      const user = await User.findOne(filter);
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          isOnline: false,
          lastLogout: new Date(),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Public (or protected)
 */
exports.getMe = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile (bio, name, photo, phone, address)
 * @route   PUT /api/auth/profile, POST /api/auth/profile
 * @access  Public (or protected)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { userId, email, name, bio, photo, phone, address } = req.body;
    const filter = userId ? { _id: userId } : { email: (email || '').toLowerCase().trim() };
    const user = await User.findOne(filter);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio;
    if (photo !== undefined) updates.photo = photo;
    if (phone !== undefined) updates.phone = phone.trim();
    if (address !== undefined) updates.address = address;

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUser(updatedUser || user),
    });
  } catch (error) {
    next(error);
  }
};
