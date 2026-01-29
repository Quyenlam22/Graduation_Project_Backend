const mongoose = require("mongoose");

// models/User.js
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: String,
  photoURL: String,
  role: { 
    type: String, 
    enum: ['user', 'admin', 'mod'], 
    default: 'user' 
  },
  state: { type: String, default: 'online' },
  lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema, "users");

module.exports = User;