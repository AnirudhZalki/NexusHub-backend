// smartbvb-backend/routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User'); // To update user's post count
const auth = require('../middleware/auth'); // Auth middleware to protect routes

// @route   POST /api/posts
// @desc    Create a new post with optional file/image upload
// @access  Private (requires token)
router.post('/', auth, async (req, res, next) => {
    // Destructure all fields, including new file-related ones
    const { type, title, content, fileBase64, fileMimeType, fileOriginalName, fileType } = req.body;

    // Basic validation for core post fields
    if (!type || !title || !content) {
        return res.status(400).json({ message: 'Please enter title, content, and type for the post.' });
    }

    // Optional validation for file if present
    if (fileBase64 && (!fileMimeType || !fileOriginalName || !fileType)) {
        return res.status(400).json({ message: 'File data requires MIME type, original name, and file type.' });
    }

    try {
        const newPost = new Post({
            user: req.user.id, // User ID from auth middleware
            type,
            title,
            content,
            fileBase64,       // Save Base64 string
            fileMimeType,     // Save MIME type
            fileOriginalName, // Save original file name
            fileType          // Save file type ('image' or 'document')
        });

        const post = await newPost.save();

        // Increment user's post count
        await User.findByIdAndUpdate(req.user.id, { $inc: { postCount: 1 } });

        // Populate user details for the response
        await post.populate('user', 'name course college');

        res.status(201).json({
            message: 'Post created successfully!',
            post: post
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/posts
// @desc    Get all posts (with optional search)
// @access  Public
router.get('/', async (req, res, next) => {
    const searchQuery = req.query.search;
    let query = {};

    if (searchQuery) {
        // Case-insensitive search on title and content
        query = {
            $or: [
                { title: { $regex: searchQuery, $options: 'i' } },
                { content: { $regex: searchQuery, $options: 'i' } }
            ]
        };
    }

    try {
        // Fetch posts, sort by createdAt (newest first), and populate user details
        const posts = await Post.find(query)
                                .sort({ createdAt: -1 })
                                .populate('user', 'name course college') // Select specific fields from user
                                .exec();
        res.status(200).json({ posts });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/posts/:id/like
// @desc    Like or unlike a post
// @access  Private (requires token)
router.post('/:id/like', auth, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id; // User ID from auth middleware

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        const isLiked = post.likedBy.includes(userId);

        if (isLiked) {
            // Unlike the post
            post.likes = Math.max(0, post.likes - 1); // Ensure likes don't go below 0
            post.likedBy = post.likedBy.filter(id => id.toString() !== userId.toString());
            res.status(200).json({ message: 'Post unliked', likes: post.likes, likedBy: post.likedBy });
        } else {
            // Like the post
            post.likes += 1;
            post.likedBy.push(userId);
            res.status(200).json({ message: 'Post liked', likes: post.likes, likedBy: post.likedBy });
        }

        await post.save();

    } catch (error) {
        next(error);
    }
});

module.exports = router;

