// smartbvb-backend/controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User'); // Assuming User model for populating sender info
const CustomError = require('../utils/customError');

// Helper to sanitize incoming data (optional, but good practice)
const sanitizeInput = (text) => {
    return text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
};

// Create a new post
exports.createPost = async (req, res, next) => {
    try {
        const { type, title, content, fileBase64, fileMimeType, fileOriginalName, fileType } = req.body;

        // Basic validation
        if (!type || !title || !content) {
            throw new CustomError('Please provide type, title, and content for the post.', 400);
        }

        const newPost = new Post({
            user: req.user.id, // User ID from auth middleware
            type: sanitizeInput(type),
            title: sanitizeInput(title),
            content: sanitizeInput(content),
            fileBase64,
            fileMimeType,
            fileOriginalName: sanitizeInput(fileOriginalName),
            fileType
        });

        const savedPost = await newPost.save();

        // Increment user's post count
        await User.findByIdAndUpdate(req.user.id, { $inc: { postCount: 1 } });

        // Populate user details for the response
        const populatedPost = await Post.findById(savedPost._id).populate('user', 'name course college').lean();

        res.status(201).json({
            message: 'Post created successfully!',
            post: populatedPost
        });
    } catch (error) {
        next(error);
    }
};

// Get all posts
exports.getPosts = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            // Case-insensitive search on title and content
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Populate user details for each post and comments' sender
        const posts = await Post.find(query)
            .populate('user', 'name course college') // Populate post creator
            .populate('comments.user', 'name')     // Populate comment sender
            .sort({ createdAt: -1 }); // Latest posts first

        res.status(200).json({
            message: 'Posts fetched successfully',
            posts
        });
    } catch (error) {
        next(error);
    }
};

// Toggle like on a post
exports.toggleLike = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await Post.findById(postId);

        if (!post) {
            throw new CustomError('Post not found.', 404);
        }

        const isLiked = post.likedBy.includes(userId);

        if (isLiked) {
            // Unlike the post
            post.likes = Math.max(0, post.likes - 1); // Ensure likes don't go below zero
            post.likedBy.pull(userId); // Remove user from likedBy array
        } else {
            // Like the post
            post.likes += 1;
            post.likedBy.push(userId); // Add user to likedBy array
        }

        await post.save();

        res.status(200).json({
            message: 'Like status updated.',
            likes: post.likes,
            likedBy: post.likedBy // Return the updated likedBy array
        });
    } catch (error) {
        next(error);
    }
};

// Get trending topics (posts)
exports.getTrendingTopics = async (req, res, next) => {
    try {
        // This is a simplified trending logic: posts with most likes in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const trendingPosts = await Post.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    likes: 1,
                    commentsCount: { $size: "$comments" } // Count comments
                }
            },
            {
                $addFields: {
                    // Combine likes and comments count for a "trend score"
                    trendScore: { $add: ["$likes", "$commentsCount"] }
                }
            },
            {
                $sort: { trendScore: -1 } // Sort by combined score
            },
            {
                $limit: 10 // Top 10 trending posts
            },
            {
                // Optionally, reshape the output to fit the frontend's 'name' and 'posts' structure
                $project: {
                    name: "$title",
                    posts: "$trendScore", // Using trendScore as 'posts' count for simplicity
                    _id: 0
                }
            }
        ]);

        res.status(200).json({
            message: 'Trending topics fetched successfully',
            trends: trendingPosts
        });
    } catch (error) {
        next(error);
    }
};

// Add a comment to a post
exports.addCommentToPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const { content } = req.body;
        const userId = req.user.id; // User ID from auth middleware

        if (!content) {
            throw new CustomError('Comment content is required.', 400);
        }

        const post = await Post.findById(postId);

        if (!post) {
            throw new CustomError('Post not found.', 404);
        }

        const newComment = {
            user: userId,
            content: sanitizeInput(content)
        };

        post.comments.push(newComment);
        await post.save();

        // After saving, re-fetch the post to ensure comments are populated correctly for the response
        const updatedPost = await Post.findById(postId).populate('comments.user', 'name');

        res.status(201).json({
            message: 'Comment added successfully!',
            comments: updatedPost.comments, // Return the full, updated comments array
            commentsCount: updatedPost.comments.length // Return updated count
        });
    } catch (error) {
        next(error);
    }
};

// Get comments for a specific post
exports.getCommentsForPost = async (req, res, next) => {
    try {
        const postId = req.params.id;

        const post = await Post.findById(postId).populate('comments.user', 'name'); // Populate user data for each comment

        if (!post) {
            throw new CustomError('Post not found.', 404);
        }

        res.status(200).json({
            message: 'Comments fetched successfully!',
            comments: post.comments
        });
    } catch (error) {
        next(error);
    }
};

// Delete a comment from a post
exports.deleteComment = async (req, res, next) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id; // User ID from auth middleware

        const post = await Post.findById(postId);

        if (!post) {
            throw new CustomError('Post not found.', 404);
        }

        const comment = post.comments.id(commentId); // Find comment by its _id

        if (!comment) {
            throw new CustomError('Comment not found.', 404);
        }

        // Check if the current user is the owner of the comment or the owner of the post
        if (comment.user.toString() !== userId && post.user.toString() !== userId) {
            throw new CustomError('Not authorized to delete this comment.', 403);
        }

        post.comments.pull(commentId); // Remove the comment from the array
        await post.save();

        // After saving, re-fetch the post to ensure comments are populated correctly for the response
        const updatedPost = await Post.findById(postId).populate('comments.user', 'name');

        res.status(200).json({
            message: 'Comment deleted successfully!',
            comments: updatedPost.comments, // Return the full, updated comments array
            commentsCount: updatedPost.comments.length // Return updated count
        });
    } catch (error) {
        next(error);
    }
};

// Delete a post
exports.deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id; // User ID from auth middleware

        console.log(`Backend: Attempting to delete post with ID: ${postId} by user: ${userId}`);

        const post = await Post.findById(postId);

        if (!post) {
            console.log(`Backend: Post with ID ${postId} not found.`);
            throw new CustomError('Post not found.', 404);
        }

        console.log(`Backend: Found post. Post owner ID: ${post.user.toString()}`);

        // Check if the authenticated user is the owner of the post
        if (post.user.toString() !== userId) {
            console.log(`Backend: User ${userId} is not authorized to delete post ${postId}.`);
            throw new CustomError('Not authorized to delete this post.', 403);
        }

        await Post.findByIdAndDelete(postId);
        console.log(`Backend: Successfully deleted post ${postId}.`);

        // Decrement user's post count
        await User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } });
        console.log(`Backend: User ${userId} post count decremented.`);

        res.status(200).json({
            message: 'Post deleted successfully!'
        });
    } catch (error) {
        console.error(`Backend Error in deletePost for post ID ${req.params.id}:`, error);
        next(error);
    }
};
