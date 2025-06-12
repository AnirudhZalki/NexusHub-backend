// smartbvb-backend/models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
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
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    // For likes
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    comments: { // Simple count, can be expanded to a subdocument array for actual comments
        type: Number,
        default: 0
    },
    // Fields for optional file attachment
    fileBase64: {
        type: String,
        default: null
    },
    fileMimeType: {
        type: String,
        default: null
    },
    fileOriginalName: {
        type: String,
        default: null
    },
    fileType: { // e.g., 'image', 'document'
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);
