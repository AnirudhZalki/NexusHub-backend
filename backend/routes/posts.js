// smartbvb-backend/routes/posts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Middleware for authenticating requests
const postController = require('../controllers/postController');

// @route   POST api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, postController.createPost);

// @route   GET api/posts
// @desc    Get all posts (with optional search)
// @access  Private (or Public, depending on app requirement)
router.get('/', auth, postController.getPosts);

// @route   POST api/posts/:id/like
// @desc    Like or unlike a post
// @access  Private
router.post('/:id/like', auth, postController.toggleLike);

// @route   GET api/posts/trending
// @desc    Get trending topics (posts)
// @access  Private (or Public)
router.get('/trending', auth, postController.getTrendingTopics);

// @route   POST api/posts/:id/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comments', auth, postController.addCommentToPost);

// @route   GET api/posts/:id/comments
// @desc    Get comments for a specific post
// @access  Private (or Public, if comments are visible to everyone)
router.get('/:id/comments', auth, postController.getCommentsForPost);

// @route   DELETE api/posts/:postId/comments/:commentId
// @desc    Delete a specific comment from a post
// @access  Private (only poster or post owner can delete)
router.delete('/:postId/comments/:commentId', auth, postController.deleteComment);

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private (only post owner can delete)
router.delete('/:id', auth, postController.deletePost);

module.exports = router;
