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
    const { type, title, content, fileBase64, fileMimeType, fileOriginalName, fileType } = req.body;

    if (!type || !title || !content) {
        return res.status(400).json({ message: 'Please enter title, content, and type for the post.' });
    }

    if (fileBase64 && (!fileMimeType || !fileOriginalName || !fileType)) {
        return res.status(400).json({ message: 'File data requires MIME type, original name, and file type.' });
    }

    try {
        const newPost = new Post({
            user: req.user.id,
            type,
            title,
            content,
            fileBase64,
            fileMimeType,
            fileOriginalName,
            fileType
        });

        const post = await newPost.save();

        await User.findByIdAndUpdate(req.user.id, { $inc: { postCount: 1 } });

        await post.populate('user', 'name course college');

        res.status(201).json({
            message: 'Post created successfully!',
            post: post
        });
    } catch (error) {
        console.error('Error creating post:', error); // Added logging
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
        query = {
            $or: [
                { title: { $regex: searchQuery, $options: 'i' } },
                { content: { $regex: searchQuery, $options: 'i' } }
            ]
        };
    }

    try {
        console.log('Attempting to fetch posts from MongoDB...'); // Added logging
        const posts = await Post.find(query)
                                 .sort({ createdAt: -1 })
                                 .populate('user', 'name course college')
                                 .exec();
        console.log(`Successfully fetched ${posts.length} posts.`); // Added logging
        res.status(200).json({ posts });
    } catch (error) {
        console.error('SERVER ERROR: Failed to fetch posts in /api/posts GET route:', error); // Enhanced error logging
        next(error);
    }
});

// @route   POST /api/posts/:id/like
// @desc    Like or unlike a post
// @access  Private (requires token)
router.post('/:id/like', auth, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        const isLiked = post.likedBy.includes(userId);

        if (isLiked) {
            post.likes = Math.max(0, post.likes - 1);
            post.likedBy = post.likedBy.filter(id => id.toString() !== userId.toString());
            res.status(200).json({ message: 'Post unliked', likes: post.likes, likedBy: post.likedBy });
        } else {
            post.likes += 1;
            post.likedBy.push(userId);
            res.status(200).json({ message: 'Post liked', likes: post.likes, likedBy: post.likedBy });
        }

        await post.save();

    } catch (error) {
        console.error('Error liking/unliking post:', error); // Added logging
        next(error);
    }
});

// @route GET /api/posts/trending
// @desc Get trending topics based on post activity
// @access Public
router.get('/trending', async (req, res, next) => {
    try {
        console.log('Attempting to fetch trending topics from MongoDB...'); // Added logging
        const trendingTopics = await Post.aggregate([
            {
                $group: {
                    _id: '$type',
                    posts: { $sum: 1 }
                }
            },
            {
                $sort: { posts: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    posts: 1
                }
            }
        ]);
        console.log(`Successfully fetched ${trendingTopics.length} trending topics.`); // Added logging

        if (trendingTopics.length === 0) {
            return res.status(200).json({
                trends: [
                    { name: 'General Discussions', posts: 10 },
                    { name: 'Study Tips', posts: 8 },
                    { name: 'Coding Challenges', posts: 7 }
                ]
            });
        }

        res.status(200).json({ trends: trendingTopics });
    } catch (error) {
        console.error('SERVER ERROR: Failed to fetch trending topics:', error); // Enhanced error logging
        next(error);
    }
});

module.exports = router;
