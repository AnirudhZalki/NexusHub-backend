// smartbvb-backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please fill a valid email address'] // Basic email regex validation
    },
    password: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    college: {
        type: String,
        required: true,
        enum: ['bvb', 'kit'], // Assuming these are your college options
        trim: true
    },
    // Optional fields for dashboard display
    postCount: {
        type: Number,
        default: 0
    },
    followersCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to hash password before saving
// 'pre' hook runs before a document is saved
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    // This prevents re-hashing an already hashed password on subsequent saves (e.g., profile updates)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10); // 10 is a good default for salt rounds
        // Hash the password using the generated salt
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Proceed with saving
    } catch (error) {
        console.error('Error hashing password in User pre-save hook:', error.message);
        next(error); // Pass the error to Mongoose
    }
});

module.exports = mongoose.model('User', UserSchema);
