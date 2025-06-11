// smartbvb-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth'); // Import auth middleware

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d', // Token expires in 1 day
    });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res, next) => {
    const { name, email, password, course, college } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email, college });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists in this college.' });
        }

        // Create new user
        user = await User.create({
            name,
            email,
            password, // Password will be hashed by pre-save hook in User model
            course,
            college
        });

        res.status(201).json({
            message: 'User registered successfully. Please login.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                course: user.course,
                college: user.college
            }
        });
    } catch (error) {
        // Handle validation errors or duplicate key errors more gracefully
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        next(error); // Pass to global error handler
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res, next) => {
    const { email, password, college } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email, college });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials or college.' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                course: user.course,
                college: user.college,
                postCount: user.postCount,
                followersCount: user.followersCount
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;