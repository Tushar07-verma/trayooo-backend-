const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration from .env
dotenv.config();

const { connectDB, getIsConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const orderRoutes = require('./routes/orderRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const errorHandler = require('./middleware/errorHandler');

// Initialize database connection
connectDB();

const app = express();

// Configure CORS for local development & production
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5000,http://127.0.0.1:5000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow any localhost/127.0.0.1 port or specified origins
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    
    callback(null, true); // Permissive in dev to ensure frontend Live Server connects reliably
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-user-id'],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files as well (enables running everything from single port 5000 if desired)
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'T-RAYO Atelier API Service',
    database: getIsConnected() ? 'connected (MongoDB)' : 'active (resilient local storage)',
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inquiries', inquiryRoutes);

// Fallback for Admin Panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on this server.`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start HTTP Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`  T-RAYO LUXURY ATELIER - BACKEND SERVER ACTIVE    `);
  console.log('====================================================');
  console.log(`  Local URL:      http://localhost:${PORT}`);
  console.log(`  API Health:     http://localhost:${PORT}/api/health`);
  console.log(`  Admin Panel:    http://localhost:${PORT}/admin.html`);
  console.log(`  Storefront:     http://localhost:${PORT}/index.html`);
  console.log('====================================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Process Error] Unhandled Rejection:', err.message);
});

module.exports = app;
