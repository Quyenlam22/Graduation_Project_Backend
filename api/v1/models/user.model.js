const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: String,
  photoURL: String,
  provider: String,
  role: { 
    type: String, 
    enum: ['user', 'admin', 'mod'], 
    default: 'user' 
  },
  favorites: {
    songs: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Song' 
    }],
    artists: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Artist' 
    }],
    albums: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Album' 
    }],
    playlists: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Playlist' 
    }]
  },
  state: { type: String, default: 'online' },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model("User", userSchema, "users");

module.exports = User;