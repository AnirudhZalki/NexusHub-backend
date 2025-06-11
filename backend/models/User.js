// smartbvb-backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-]+(\.[\w-]+)*@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6 // Minimum password length
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    college: {
        type: String,
        required: true,
        enum: ['bvb', 'kit'], // Updated: Removed 'sdm' from here
        trim: true
    },
    postCount: {
        type: Number,
        default: 0
    },
    followersCount: { // Example field, could be used for follower count
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash the password before saving the user
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with hashed password in DB
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

