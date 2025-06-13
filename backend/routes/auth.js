// smartbvb-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Path to your User model
const auth = require('../middleware/auth'); // For the /auth/me route and profile update

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res, next) => {
    const { name, email, password, course, college } = req.body;

    // Basic validation
    if (!name || !email || !password || !course || !college) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        user = new User({
            name,
            email,
            password, // Password will be hashed by a pre-save hook in User model
            course,
            college
        });

        // The password hashing logic is usually in the User model's pre('save') hook.
        // It's good practice to keep it there. Ensure your User.js has this.
        await user.save();

        // Create JWT
        const payload = {
            user: {
                id: user.id // Mongoose creates .id from _id
            }
        };

        // Get JWT Secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not defined in environment variables!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                // For signup, we just confirm registration. Login is a separate step.
                res.status(201).json({ message: 'User registered successfully. Please login to continue.', token });
            }
        );

    } catch (error) {
        console.error('Error in signup route:', error.message);
        next(error); // Pass error to global error handler
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res, next) => {
    const { email, password, college } = req.body;

    // Basic validation
    if (!email || !password || !college) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        console.log(`Login attempt for email: ${email}, college: ${college}`);
        let user = await User.findOne({ email });

        if (!user) {
            console.log(`Login failed: User not found for email: ${email}`);
            return res.status(400).json({ message: 'Invalid Credentials.' });
        }
        console.log(`User found for email: ${email}. Hashed password in DB: ${user.password.substring(0, 10)}...`);


        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for email: ${email}`);
            // If bcrypt.compare fails, it means the provided password doesn't match the hashed one.
            // This is the most likely source of "Invalid Credentials" for new users.
            return res.status(400).json({ message: 'Invalid Credentials.' });
        }
        console.log(`Login successful: Password matched for email: ${email}`);


        // Check college (optional, depending on your app's logic)
        if (user.college !== college) {
            console.log(`Login failed: College mismatch for user ${email}. Provided: ${college}, DB: ${user.college}`);
            return res.status(400).json({ message: 'Invalid college selected for this user.' });
        }

        // Create JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not defined in environment variables!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                // Return user object with token, excluding password
                res.status(200).json({
                    message: 'Logged in successfully!',
                    token,
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        course: user.course,
                        college: user.college,
                        postCount: user.postCount,
                        followersCount: user.followersCount
                        // Add other user fields you want to expose to the frontend
                    }
                });
            }
        );

    } catch (error) {
        console.error('Error in login route:', error.message);
        next(error);
    }
});

// @route   GET /api/auth/me
// @desc    Get logged in user data
// @access  Private (requires token)
router.get('/me', auth, async (req, res, next) => {
    try {
        // req.user.id comes from the auth middleware
        const user = await User.findById(req.user.id).select('-password'); // Exclude password from response
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error in /auth/me route:', error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid User ID.' });
        }
        res.status(500).json({ message: 'Server Error.' });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile (name, course, college)
// @access  Private (requires token)
router.put('/profile', auth, async (req, res, next) => {
    const { name, course, college } = req.body;

    try {
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update fields if provided
        if (name) user.name = name;
        if (course) user.course = course;
        if (college) user.college = college;

        await user.save(); // Save the updated user document

        // Return updated user data (excluding password)
        res.status(200).json({
            message: 'Profile updated successfully!',
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
        console.error('Error updating user profile:', error.message);
        next(error); // Pass error to global error handler
    }
});

module.exports = router;
