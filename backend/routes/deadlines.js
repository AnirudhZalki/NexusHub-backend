// smartbvb-backend/routes/deadlines.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you have this middleware
const Deadline = require('../models/Deadline');
const User = require('../models/User'); // To get user's college for public deadlines

// @route   POST /api/deadlines
// @desc    Create a new deadline
// @access  Private
router.post('/', auth, async (req, res, next) => {
    const { title, description, dueDate, type, isPublic } = req.body;

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
            isPublic: isPublic || false,
            college: user.college // Associate deadline with user's college
        });

        const deadline = await newDeadline.save();
        res.status(201).json({ message: 'Deadline added successfully!', deadline });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/deadlines
// @desc    Get all deadlines (private for user, and public for user's college)
// @access  Private
router.get('/', auth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userCollege = user.college;

        const deadlines = await Deadline.find({
            $or: [
                { user: userId }, // Private deadlines of the user
                { isPublic: true, college: userCollege } // Public deadlines from the same college
            ]
        })
        .sort({ dueDate: 1, createdAt: -1 }); // Sort by due date ascending, then creation date descending

        res.status(200).json({ deadlines });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/deadlines/:id
// @desc    Delete a deadline (only by owner)
// @access  Private
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const deadline = await Deadline.findById(req.params.id);

        if (!deadline) {
            return res.status(404).json({ message: 'Deadline not found.' });
        }

        // Check if the authenticated user is the owner of the deadline
        if (deadline.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this deadline.' });
        }

        await deadline.deleteOne();
        res.status(200).json({ message: 'Deadline deleted successfully!' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
