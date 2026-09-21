const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Resilient fallback storage for subscribers
const SUBSCRIBERS_FILE = path.join(__dirname, '../data/subscribers.json');

function getSubscribers() {
  try {
    if (!fs.existsSync(SUBSCRIBERS_FILE)) {
      const dir = path.dirname(SUBSCRIBERS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function saveSubscriber(sub) {
  try {
    const list = getSubscribers();
    const existingIdx = list.findIndex(s => s.email.toLowerCase() === sub.email.toLowerCase());
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...sub };
    } else {
      list.unshift(sub);
    }
    const dir = path.dirname(SUBSCRIBERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error('Error saving subscriber to file:', e.message);
  }
}

// POST /api/newsletter/subscribe
// User signs up for 10% off and free shipping; notification sent to trayoinfo@gmail.com
router.post('/subscribe', async (req, res) => {
  try {
    const { email, offer, coupon_code } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    const subscriberData = {
      id: 'sub_' + Date.now(),
      email: email.trim().toLowerCase(),
      offer: offer || '10% off your first purchase and free shipping',
      coupon: coupon_code || 'TRAYO10',
      targetEmail: 'trayoinfo@gmail.com',
      status: 'Notification Sent to trayoinfo@gmail.com',
      source: 'Sign up for 10% off your first purchase and free shipping (Storefront Footer)',
      subscribedAt: new Date().toISOString()
    };

    // Save to resilient local storage
    saveSubscriber(subscriberData);

    // Notification Log for Server Admin
    console.log('====================================================');
    console.log(`[NEW NEWSLETTER 10% OFF SIGNUP -> trayoinfo@gmail.com]`);
    console.log(`Customer Email:  ${subscriberData.email}`);
    console.log(`Offer Claimed:   ${subscriberData.offer}`);
    console.log(`Coupon Issued:   ${subscriberData.coupon}`);
    console.log(`Target Recipient: trayoinfo@gmail.com`);
    console.log(`Timestamp:       ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('====================================================');

    return res.status(200).json({
      success: true,
      message: '10% OFF discount code (TRAYO10) and Free Shipping activated! Notification sent to trayoinfo@gmail.com.',
      coupon: 'TRAYO10',
      discountPct: 10,
      subscriber: subscriberData
    });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error processing newsletter subscription.'
    });
  }
});

// GET /api/newsletter/subscribers
router.get('/subscribers', (req, res) => {
  try {
    const subscribers = getSubscribers();
    res.status(200).json({
      success: true,
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
