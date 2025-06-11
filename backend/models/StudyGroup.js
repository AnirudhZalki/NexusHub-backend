// smartbvb-backend/models/StudyGroup.js
const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Group names should be unique
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    creator: { // The user who created this group
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    college: { // Group is affiliated with a college
        type: String,
        required: true,
        enum: ['bvb', 'kit'] // Matches your User model's college enum
    },
    members: [{ // Array of user IDs who are members of this group
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    tags: [{ // Topics or subjects this group focuses on
        type: String,
        trim: true,
        lowercase: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
