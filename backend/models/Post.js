// smartbvb-backend/models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true }); // Ensure _id is generated for each comment sub-document

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: { // e.g., 'book', 'notes', 'personal', 'question'
        type: String,
        required: true,
        enum: ['book', 'notes', 'personal', 'question']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    fileBase64: { // Storing base64 for small files/images
        type: String,
        maxlength: 5 * 1024 * 1024 // 5MB limit in base64 string length, adjust as needed
    },
    fileMimeType: {
        type: String
    },
    fileOriginalName: {
        type: String
    },
    fileType: { // 'image' or 'document'
        type: String,
        enum: ['image', 'document']
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{ // Array of user IDs who liked the post
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [commentSchema] // Array of comments using the defined commentSchema
}, { timestamps: true });

// Index for efficient retrieval of posts by user or type, or for searches
postSchema.index({ user: 1, type: 1, title: 'text', content: 'text' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
