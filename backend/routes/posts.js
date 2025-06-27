const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User'); // Import User model to update postCount

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, async (req, res) => {
    const { type, title, content, fileBase64, fileMimeType, fileOriginalName, fileType } = req.body;

    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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

        // Defensive check: Filter out any non-object/null entries from the comments array
        // This handles potential existing corrupted data before saving the document.
        // It's applied here to prevent validation issues on initial post creation as well
        // if for some reason a default 'comments' array in the schema might trigger it,
        // although it's more common on updates.
        newPost.comments = (newPost.comments || []).filter(c => typeof c === 'object' && c !== null);


        const post = await newPost.save();

        // Increment user's postCount
        user.postCount = (user.postCount || 0) + 1;
        await user.save();

        // Populate user data before sending the response
        const populatedPost = await Post.findById(post._id).populate('user', ['name', 'course', 'college']);

        res.status(201).json({ message: 'Post created successfully', post: populatedPost });

    } catch (err) {
        console.error('Error creating post:', err.message); // Log the specific error message
        if (err.name === 'ValidationError') {
            // Mongoose validation error (e.g., missing required field, type mismatch)
            return res.status(400).json({ message: err.message, errors: err.errors });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/posts
// @desc    Get all posts (with optional search)
// @access  Private (only logged-in users can see posts)
router.get('/', auth, async (req, res) => {
    const { search } = req.query;
    try {
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            };
        }
        // Fetch posts and populate user data
        // Sort by createdAt in descending order (latest first)
        const posts = await Post.find(query)
            .populate('user', ['name', 'course', 'college'])
            .populate('comments.user', ['name']) // Populate user for each comment
            .sort({ createdAt: -1 }); // Latest posts first

        res.status(200).json({ posts });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private (only owner can delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if the user is the owner of the post
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Post.deleteOne({ _id: req.params.id }); // Use deleteOne to remove the document

        // Decrement user's postCount
        const user = await User.findById(req.user.id);
        if (user) {
            user.postCount = Math.max(0, (user.postCount || 0) - 1);
            await user.save();
        }

        res.status(200).json({ message: 'Post removed' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/posts/:id/like
// @desc    Toggle like on a post
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Defensive check: Filter out any non-object/null entries from the comments array
        // This handles existing corrupted data before saving the document.
        post.comments = post.comments.filter(c => typeof c === 'object' && c !== null);

        // Check if the post has already been liked by this user
        const isLiked = post.likedBy.includes(req.user.id);

        if (isLiked) {
            // If already liked, unlike it
            post.likedBy = post.likedBy.filter(
                (like) => like.toString() !== req.user.id
            );
            post.likes = Math.max(0, post.likes - 1); // Ensure likes don't go below zero
            await post.save();
            return res.status(200).json({ message: 'Post unliked', likes: post.likes, likedBy: post.likedBy });
        } else {
            // If not liked, like it
            post.likedBy.unshift(req.user.id); // Add user ID to the beginning
            post.likes += 1;
            await post.save();
            return res.status(200).json({ message: 'Post liked', likes: post.likes, likedBy: post.likedBy });
        }
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/posts/:id/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comments', auth, async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Comment content is required' });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Defensive check: Filter out any non-object/null entries from the comments array
        // This addresses the "Parameter "obj" to Document() must be an object, got "0" (type number)" error
        // if existing corrupted data is causing the issue.
        post.comments = post.comments.filter(c => typeof c === 'object' && c !== null);

        const newComment = {
            user: req.user.id, // The ID of the user commenting
            content,
            createdAt: Date.now()
        };

        post.comments.unshift(newComment); // Add new comment to the beginning of the array (most recent first)
        await post.save(); // This should now succeed even if there were bad entries before

        // Populate user data for all comments before sending back
        const populatedPost = await Post.findById(req.params.id)
            .populate('comments.user', ['name']); // Only need name for comment user

        // Return all comments for the post
        res.status(201).json({ message: 'Comment added successfully', comments: populatedPost.comments });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/posts/:id/comments
// @desc    Get all comments for a post
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        // Populate user data for all comments
        await post.populate('comments.user', ['name']); // Only need name for comment user

        res.status(200).json({ comments: post.comments });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/posts/:post_id/comments/:comment_id
// @desc    Delete a comment from a post
// @access  Private (only comment owner or post owner can delete)
router.delete('/:post_id/comments/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Pull out comment
        const comment = post.comments.find(
            (comment) => comment.id === req.params.comment_id
        );

        // Make sure comment exists
        if (!comment) {
            return res.status(404).json({ message: 'Comment does not exist' });
        }

        // Check user authorization
        // User deleting must be the owner of the comment OR the owner of the post
        if (
            comment.user.toString() !== req.user.id &&
            post.user.toString() !== req.user.id
        ) {
            return res.status(401).json({ message: 'User not authorized to delete this comment' });
        }

        // Remove the comment
        post.comments = post.comments.filter(
            ({ id }) => id !== req.params.comment_id
        );

        await post.save();

        res.status(200).json({ message: 'Comment removed successfully' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post or comment not found' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/posts/trending
// @desc    Get trending topics (based on post types and popularity)
// @access  Public (or Private if you want to restrict)
router.get('/trending', async (req, res) => {
    try {
        // Aggregate posts by type and count them
        const trends = await Post.aggregate([
            {
                $group: {
                    _id: "$type", // Group by the 'type' field of posts
                    posts: { $sum: 1 } // Count documents in each group
                }
            },
            {
                $project: {
                    _id: 0, // Exclude _id from the final output
                    name: "$_id", // Rename _id to 'name' for trend name
                    posts: 1 // Include the count
                }
            },
            {
                $sort: { posts: -1 } // Sort by post count in descending order
            },
            {
                $limit: 5 // Limit to top 5 trending topics
            }
        ]);

        res.status(200).json({ trends });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
