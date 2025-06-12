// smartbvb-backend/models/Group.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true // Remove whitespace from both ends of a string
    },
    timestamp: {
        type: Date,
        default: Date.now
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
    }
});

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    tags: [
        {
            type: String,
            trim: true
        }
    ],
    creator: { // New: Stores the ID of the user who created the group (admin)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [ // Users who have joined the group
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    messages: [MessageSchema], // New: Array to store messages within the group
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure creator is added to members on creation
GroupSchema.pre('save', function(next) {
    if (this.isNew && !this.members.includes(this.creator)) {
        this.members.push(this.creator);
    }
    next();
});

module.exports = mongoose.model('Group', GroupSchema);
