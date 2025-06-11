// smartbvb-backend/routes/deadlines.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Deadline = require('../models/Deadline');
const User = require('../models/User'); // Required to get user's college for filtering

// @route   POST /api/deadlines
// @desc    Create a new deadline
// @access  Private
router.post('/', auth, async (req, res, next) => {
    const { title, description, dueDate, type, isPublic } = req.body;

    // Basic validation
    if (!title || !dueDate || !type) {
        return res.status(400).json({ message: 'Title, due date, and type are required for a deadline.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const newDeadline = new Deadline({
            user: req.user.id,
            title,
            description,
            dueDate: new Date(dueDate), // Ensure it's a Date object
            type,
            college: user.college, // Assign deadline to user's college
            isPublic: isPublic || false // Default to false if not provided
        });

        const deadline = await newDeadline.save();
        await deadline.populate('user', 'name course college'); // Populate user info for response

        res.status(201).json({
            message: 'Deadline created successfully!',
            deadline
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/deadlines
// @desc    Get deadlines for the authenticated user's college
//          Can filter by `mine=true` to get only user's own deadlines
// @access  Private
router.get('/', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let query = { college: user.college }; // Default: get deadlines for the user's college

        // If 'mine=true' is provided, filter for only the current user's deadlines
        if (req.query.mine === 'true') {
            query.user = req.user.id;
        } else {
            // Otherwise, get public deadlines for the college AND private deadlines of the user
            // This ensures a user always sees their own private deadlines + public college deadlines
            query.$or = [
                { isPublic: true },
                { user: req.user.id }
            ];
        }

        const deadlines = await Deadline.find(query)
                                    .sort({ dueDate: 1, createdAt: -1 }) // Sort by soonest due date, then newest created
                                    .populate('user', 'name') // Populate creator's name
                                    .exec();
        res.status(200).json({ deadlines });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/deadlines/:id
// @desc    Delete a deadline
// @access  Private (only creator can delete)
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const deadline = await Deadline.findById(req.params.id);

        if (!deadline) {
            return res.status(404).json({ message: 'Deadline not found.' });
        }

        // Check if the authenticated user is the creator of the deadline
        if (deadline.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this deadline.' });
        }

        await Deadline.deleteOne({ _id: req.params.id }); // Using deleteOne for clarity
        res.status(200).json({ message: 'Deadline removed successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
