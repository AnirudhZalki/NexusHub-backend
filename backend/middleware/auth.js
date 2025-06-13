// smartbvb-backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from the 'Authorization' header
    // The frontend sends it as 'Bearer YOUR_TOKEN_HERE'
    const authHeader = req.header('Authorization');

    // Check if Authorization header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // If not, it's either no token or malformed header
        return res.status(401).json({ message: 'No token, authorization denied. Please include a valid Bearer token.' });
    }

    // Extract the token (remove 'Bearer ' prefix)
    const token = authHeader.split(' ')[1];

    // Verify token
    try {
        // Get JWT Secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;

        // Critical: Check if JWT_SECRET is actually defined
        if (!jwtSecret) {
            console.error('JWT_SECRET environment variable is NOT defined in auth middleware!');
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing.' });
        }

        // Verify the token using the secret
        const decoded = jwt.verify(token, jwtSecret);

        // Attach the decoded user payload to the request object
        // This makes req.user available in all protected routes
        req.user = decoded.user;
        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error('Token verification failed:', err.message);
        // Handle different JWT errors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }
        // For other verification failures (e.g., malformed, invalid signature)
        res.status(401).json({ message: 'Token is not valid. Please log in again.' });
    }
};
