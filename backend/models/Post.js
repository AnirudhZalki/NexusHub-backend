// smartbvb-backend/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['book', 'notes', 'personal', 'question'] // Define allowed post types
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
        maxlength: 1000
    },
    // --- NEW FIELDS FOR FILE/IMAGE UPLOAD ---
    fileBase64: { // Base64 encoded string of the file/image
        type: String,
        default: null
    },
    fileMimeType: { // e.g., 'image/jpeg', 'application/pdf'
        type: String,
        default: null
    },
    fileOriginalName: { // Original name of the uploaded file
        type: String,
        default: null
    },
    fileType: { // 'image' or 'document' (for frontend display)
        type: String,
        enum: ['image', 'document', null],
        default: null
    },
    // --- END NEW FIELDS ---
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{ // Array to store user IDs who liked the post (for easy toggling)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: { // Simple counter for comments
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', postSchema);

