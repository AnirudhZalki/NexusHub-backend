const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/users/search
// @desc    Search for users by name or email (excluding the current user)
// @access  Private
router.get('/search', auth, async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }

    try {
        // Find users whose name or email matches the query (case-insensitive)
        // Exclude the current authenticated user from the search results
        const users = await User.find({
            _id: { $ne: req.user.id }, // Exclude current user
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('-password -date'); // Exclude sensitive fields

        // For each found user, determine if the current user is already following them
        const currentUser = await User.findById(req.user.id).select('following');
        if (!currentUser) {
            return res.status(404).json({ message: 'Current user not found' });
        }

        const usersWithFollowStatus = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            course: user.course,
            college: user.college,
            postCount: user.postCount,
            followersCount: user.followersCount,
            isFollowing: currentUser.following.includes(user._id)
        }));

        res.status(200).json({ users: usersWithFollowStatus });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', auth, async (req, res) => {
    try {
        const userToFollowId = req.params.id;
        const currentUserId = req.user.id;

        // Ensure user cannot follow themselves
        if (userToFollowId === currentUserId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const userToFollow = await User.findById(userToFollowId);
        const currentUser = await User.findById(currentUserId);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already following
        if (currentUser.following.includes(userToFollowId)) {
            return res.status(400).json({ message: 'You are already following this user' });
        }

        // Add to current user's following list
        currentUser.following.unshift(userToFollowId);
        await currentUser.save();

        // Increment the followed user's followersCount
        userToFollow.followersCount = (userToFollow.followersCount || 0) + 1;
        await userToFollow.save();

        res.status(200).json({ message: 'User followed successfully', userId: userToFollowId });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:id/unfollow', auth, async (req, res) => {
    try {
        const userToUnfollowId = req.params.id;
        const currentUserId = req.user.id;

        const userToUnfollow = await User.findById(userToUnfollowId);
        const currentUser = await User.findById(currentUserId);

        if (!userToUnfollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if currently following
        if (!currentUser.following.includes(userToUnfollowId)) {
            return res.status(400).json({ message: 'You are not following this user' });
        }

        // Remove from current user's following list
        currentUser.following = currentUser.following.filter(
            (followedId) => followedId.toString() !== userToUnfollowId
        );
        await currentUser.save();

        // Decrement the unfollowed user's followersCount
        userToUnfollow.followersCount = Math.max(0, (userToUnfollow.followersCount || 0) - 1);
        await userToUnfollow.save();

        res.status(200).json({ message: 'User unfollowed successfully', userId: userToUnfollowId });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
