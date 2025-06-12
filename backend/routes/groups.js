// smartbvb-backend/routes/groups.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you have this middleware
const Group = require('../models/Group');
const User = require('../models/User'); // To update user's group count if needed

// @route   POST /api/groups
// @desc    Create a new study group
// @access  Private
router.post('/', auth, async (req, res, next) => {
    const { name, description, tags } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required.' });
    }

    try {
        const newGroup = new Group({
            name,
            description,
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []),
            creator: req.user.id, // Set the creator as the current user
            members: [req.user.id] // Creator is automatically a member
        });

        const group = await newGroup.save();

        // Populate creator details for the response
        await group.populate('creator', 'name'); // Only populate name for creator
        // Also populate members with just name
        await group.populate('members', 'name');


        res.status(201).json({ message: 'Study group created successfully!', group });
    } catch (error) {
        // Handle duplicate group name error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
            return res.status(400).json({ message: 'A group with this name already exists.' });
        }
        next(error);
    }
});

// @route   GET /api/groups
// @desc    Get all study groups or groups joined by the user
// @access  Private (users should be logged in to view groups)
router.get('/', auth, async (req, res, next) => {
    const myGroupsOnly = req.query.myGroups === 'true';
    let query = {};

    if (myGroupsOnly) {
        query.members = req.user.id; // Filter for groups where current user is a member
    }

    try {
        const groups = await Group.find(query)
                                  .populate('creator', 'name') // Populate creator's name
                                  .populate('members', 'name') // Populate members' names
                                  .sort({ createdAt: -1 });

        res.status(200).json({ groups });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/groups/:id
// @desc    Get a single study group by ID
// @access  Private (user must be a member or public group if you implement it)
router.get('/:id', auth, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id)
                                 .populate('creator', 'name')
                                 .populate('members', 'name')
                                 .populate('messages.sender', 'name'); // Populate sender for each message

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if user is a member of the group before allowing access to messages
        if (!group.members.some(member => member._id.toString() === req.user.id.toString())) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        res.status(200).json({ group });
    } catch (error) {
        next(error);
    }
});


// @route   POST /api/groups/:id/join
// @desc    Join a study group
// @access  Private
router.post('/:id/join', auth, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if already a member
        if (group.members.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already a member of this group.' });
        }

        group.members.push(req.user.id);
        await group.save();

        // Populate members to return updated list
        await group.populate('members', 'name');

        res.status(200).json({ message: 'Successfully joined group!', group });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave a study group
// @access  Private
router.post('/:id/leave', auth, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Prevent creator from leaving (they should delete the group)
        if (group.creator.toString() === req.user.id.toString()) {
            return res.status(400).json({ message: 'Group creator cannot leave. Please delete the group instead.' });
        }

        // Check if user is a member
        if (!group.members.includes(req.user.id)) {
            return res.status(400).json({ message: 'Not a member of this group.' });
        }

        group.members = group.members.filter(member => member.toString() !== req.user.id.toString());
        await group.save();

        // Populate members to return updated list
        await group.populate('members', 'name');

        res.status(200).json({ message: 'Successfully left group.', group });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/groups/:id
// @desc    Delete a study group (only by creator)
// @access  Private
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        // Check if the authenticated user is the creator of the group
        if (group.creator.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this group.' });
        }

        await group.deleteOne(); // Use deleteOne() for Mongoose 6+

        res.status(200).json({ message: 'Study group deleted successfully!' });
    } catch (error) {
        next(error);
    }
});


// --- NEW MESSAGE ROUTES ---

// @route   POST /api/groups/:groupId/messages
// @desc    Send a message to a group
// @access  Private (user must be a member)
router.post('/:groupId/messages', auth, async (req, res, next) => {
    const { content, fileBase64, fileMimeType, fileOriginalName, fileType } = req.body;
    const groupId = req.params.groupId;

    // Basic validation for message content or file
    if (!content && !fileBase64) {
        return res.status(400).json({ message: 'Message content or a file is required.' });
    }
    if (fileBase64 && (!fileMimeType || !fileOriginalName || !fileType)) {
        return res.status(400).json({ message: 'File data requires MIME type, original name, and file type.' });
    }

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found.' });
        }

        // Check if the user is a member of the group
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        const newMessage = {
            sender: req.user.id,
            content: content || '', // Ensure content is not null if only file
            fileBase64: fileBase64 || null,
            fileMimeType: fileMimeType || null,
            fileOriginalName: fileOriginalName || null,
            fileType: fileType || null,
            timestamp: new Date()
        };

        group.messages.push(newMessage);
        await group.save();

        // FIX: Instead of populating the nested doc directly,
        // we can construct the response message using req.user.name for the sender.
        // req.user is already populated by the auth middleware with user details.
        const responseMessage = {
            _id: group.messages[group.messages.length - 1]._id, // Get the _id of the newly added message
            sender: {
                _id: req.user._id, // Use req.user's ID
                name: req.user.name // Use req.user's name
            },
            content: newMessage.content,
            fileBase64: newMessage.fileBase64,
            fileMimeType: newMessage.fileMimeType,
            fileOriginalName: newMessage.fileOriginalName,
            fileType: newMessage.fileType,
            timestamp: newMessage.timestamp
        };

        res.status(201).json({ message: 'Message sent!', message: responseMessage });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/groups/:groupId/messages
// @desc    Get messages for a specific group
// @access  Private (user must be a member)
router.get('/:groupId/messages', auth, async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const group = await Group.findById(groupId)
                                 .populate('messages.sender', 'name'); // This populate is correct as it's on the main document

        if (!group) {
            return res.status(404).json({ message: 'Group not found.' });
        }

        // Check if the user is a member of the group
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        res.status(200).json({ messages: group.messages });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/groups/:groupId/messages/:messageId
// @desc    Delete a message from a group (only by sender or group creator)
// @access  Private
router.delete('/:groupId/messages/:messageId', auth, async (req, res, next) => {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found.' });
        }

        const messageIndex = group.messages.findIndex(msg => msg._id.toString() === messageId);

        if (messageIndex === -1) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        const messageToDelete = group.messages[messageIndex];

        // Check if current user is the sender of the message OR the group creator
        if (messageToDelete.sender.toString() !== userId.toString() && group.creator.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this message.' });
        }

        group.messages.splice(messageIndex, 1); // Remove the message
        await group.save();

        res.status(200).json({ message: 'Message deleted successfully!' });
    } catch (error) {
        next(error);
    }
});


module.exports = router;
