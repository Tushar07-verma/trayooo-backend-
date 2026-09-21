/**
 * T-RAYO Admin Authentication Middleware
 * 
 * NOTE: As explicitly requested, admin password/login is NOT enforced right now.
 * This middleware is structured so that proper admin authentication (e.g. JWT verification,
 * admin role validation, API keys) can be toggled on in the future without rewriting
 * any routes or controllers.
 * 
 * To enable future admin authentication:
 * 1. Set REQUIRE_ADMIN_AUTH=true in backend/.env
 * 2. Supply JWT Bearer token or x-admin-key header in admin requests.
 */

const adminAuth = (req, res, next) => {
  const requireAuth = process.env.REQUIRE_ADMIN_AUTH === 'true';

  // If admin auth is not currently enforced, allow immediate access
  if (!requireAuth) {
    return next();
  }

  // Master Admin Key or Bearer Token Authentication
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'trayo2026';

  if (adminKey && adminKey === expectedKey) {
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === expectedKey) {
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Admin authorization required. Please provide valid admin credentials.',
  });
};

module.exports = adminAuth;
