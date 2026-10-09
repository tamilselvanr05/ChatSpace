const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    isOnline: {
        type: Boolean,
        default: false
    },

    about: {
    type: String,
    default: "Hey there! I am using ChatSpace.",
    maxlength: 150
},

    profilePhoto: {
        type: String,
        default: null
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;