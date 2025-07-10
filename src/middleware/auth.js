const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    console.log('Auth middleware - Headers:', req.headers);
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    console.log('Auth middleware - Verifying token');
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token verified:', verified);

    if (!verified.user || !verified.user.id) {
      console.log('Auth middleware - Invalid token format');
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    req.user = verified.user;
    console.log('Auth middleware - User authenticated:', req.user);
    next();
  } catch (err) {
    console.error('Auth middleware error:', {
      message: err.message,
      stack: err.stack,
      headers: req.headers
    });
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    console.log('Role check - User:', req.user);
    console.log('Role check - Required roles:', roles);
    
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      console.log('Role check - Access denied');
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    console.log('Role check - Access granted');
    next();
  };
};

module.exports = { auth, checkRole }; 