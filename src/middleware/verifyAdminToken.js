const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY

// Universal token verification middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied. No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify admin role
const verifyAdminToken = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied. Admins only' });
        }
        next();
    });
};

// Middleware to verify user role (any authenticated user)
const verifyUserToken = (req, res, next) => {
    verifyToken(req, res, () => {
        if (!req.user.role || !['user', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied. Valid user role required' });
        }
        next();
    });
};

module.exports = {
    verifyToken,
    verifyAdminToken,
    verifyUserToken
};