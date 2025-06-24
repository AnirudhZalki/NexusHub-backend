// smartbvb-backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const CustomError = require('../utils/customError'); // Assuming CustomError is available for consistent error handling

module.exports = function(req, res, next) {
    // Get token from the 'Authorization' header
    // The frontend sends it as 'Bearer YOUR_TOKEN_HERE'
    const authHeader = req.header('Authorization');

    // Check if Authorization header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // If not, it's either no token or malformed header
        return next(new CustomError('No token, authorization denied. Please include a valid Bearer token.', 401));
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
            return next(new CustomError('Server configuration error: JWT_SECRET missing.', 500));
        }

        // Verify the token using the secret
        const decoded = jwt.verify(token, jwtSecret);

        // --- POTENTIAL FIX AREA ---
        // Ensure req.user is an object and its 'id' property is explicitly set from the decoded token's user ID.
        // This ensures the type is correct for Mongoose.
        if (decoded.user && decoded.user.id) {
            req.user = { id: String(decoded.user.id) }; // Explicitly convert to string
        } else {
            console.error('JWT payload missing user ID:', decoded);
            return next(new CustomError('Invalid token payload: User ID missing.', 401));
        }
        // --- END POTENTIAL FIX AREA ---

        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error('Token verification failed:', err.message);
        // Handle different JWT errors
        if (err.name === 'TokenExpiredError') {
            return next(new CustomError('Token expired. Please log in again.', 401));
        }
        // For other verification failures (e.g., malformed, invalid signature)
        return next(new CustomError('Token is not valid. Please log in again.', 401));
    }
};
