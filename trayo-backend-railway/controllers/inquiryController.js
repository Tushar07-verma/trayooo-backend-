const Inquiry = require('../models/Inquiry');

/**
 * @desc    Submit a concierge inquiry / support ticket
 * @route   POST /api/inquiries
 * @access  Public
 */
exports.createInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, channel, userId } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.',
      });
    }

    const inquiryId = '#INQ-' + Math.floor(100000 + Math.random() * 900000);

    const inquiry = await Inquiry.create({
      inquiryId,
      channel: channel || 'email',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      subject: (subject || 'Atelier Concierge Inquiry').trim(),
      message: message.trim(),
      status: 'new',
      userId: userId || null,
    });

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. Our concierge will reply shortly.',
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inquiries list
 * @route   GET /api/inquiries
 * @access  Admin
 */
exports.getInquiries = async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find();
    res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    next(error);
  }
};
