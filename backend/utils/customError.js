// smartbvb-backend/utils/customError.js

/**
 * Custom Error class to standardize API error responses.
 * It includes a statusCode for HTTP responses and an optional operational flag.
 */
class CustomError extends Error {
    constructor(message, statusCode) {
        super(message); // Call the parent Error constructor
        this.statusCode = statusCode;
        // All errors that extend CustomError are operational errors
        // This helps distinguish trusted errors (which we can handle programmatically)
        // from programming errors (bugs)
        this.isOperational = true;

        // Capture the stack trace, excluding the constructor call, for better debugging
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = CustomError;
