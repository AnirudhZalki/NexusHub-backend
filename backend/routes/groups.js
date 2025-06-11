// smartbvb-backend/routes/groups.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const StudyGroup = require('../models/StudyGroup');
const User = require('../models/User'); // To get user's college

// @route   POST /api/groups
// @desc    Create a new study group
// @access  Private
router.post('/', auth, async (req, res, next) => {
    const { name, description, tags } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if group name already exists
        let group = await StudyGroup.findOne({ name });
        if (group) {
            return res.status(400).json({ message: 'A group with this name already exists.' });
        }

        const newGroup = new StudyGroup({
            name,
            description: description || '',
            creator: req.user.id,
            college: user.college, // Group belongs to the creator's college
            members: [req.user.id], // Creator is automatically a member
            tags: tags || []
        });

        group = await newGroup.save();
        await group.populate('creator', 'name').populate('members', 'name'); // Populate creator and members info

        res.status(201).json({
            message: 'Study group created successfully!',
            group
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/groups
// @desc    Get all study groups for the authenticated user's college
//          Can filter by `myGroups=true` to get only groups user is a member of
// @access  Private
router.get('/', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let query = { college: user.college }; // Default: groups within the user's college

        // If 'myGroups=true' is provided, filter for groups the user is a member of
        if (req.query.myGroups === 'true') {
            query.members = req.user.id;
        }

        const groups = await StudyGroup.find(query)
                                        .populate('creator', 'name')
                                        .populate('members', 'name') // Populate members' names
                                        .sort({ createdAt: -1 })
                                        .exec();
        res.status(200).json({ groups });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/groups/:id/join
// @desc    Join a study group
// @access  Private
router.post('/:id/join', auth, async (req, res, next) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if user is already a member
        if (group.members.includes(userId)) {
            return res.status(400).json({ message: 'Already a member of this group.' });
        }

        group.members.push(userId);
        await group.save();
        await group.populate('members', 'name'); // Populate members' names for response

        res.status(200).json({
            message: 'Successfully joined the group!',
            group
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave a study group
// @access  Private
router.post('/:id/leave', auth, async (req, res, next) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if user is a member
        if (!group.members.includes(userId)) {
            return res.status(400).json({ message: 'Not a member of this group.' });
        }

        // Prevent creator from leaving if they are the only member left
        if (group.creator.toString() === userId && group.members.length === 1) {
             // Option 1: Prevent leaving (and maybe prompt to delete group)
            return res.status(400).json({ message: 'Creator cannot leave if they are the only member. Consider deleting the group instead.' });
            // Option 2: Allow leaving and if 0 members, delete group (requires more logic)
        }

        group.members = group.members.filter(memberId => memberId.toString() !== userId.toString());
        await group.save();
        await group.populate('members', 'name'); // Populate members' names for response

        res.status(200).json({
            message: 'Successfully left the group.',
            group
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/groups/:id
// @desc    Delete a study group (only by creator)
// @access  Private
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const group = await StudyGroup.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if the authenticated user is the creator of the group
        if (group.creator.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this group.' });
        }

        await StudyGroup.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Study group deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
