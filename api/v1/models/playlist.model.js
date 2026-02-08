const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");
mongoose.plugin(slug);

const playlistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  avatar: String,
  description: String,
  userId: {
    type: String,
    default: "system"
  }, // "system" cho playlist mặc định
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  status: {
    type: String,
    default: "active"
  },
  slug: {
    type: String,
    slug: "title",
    unique: true
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Playlist = mongoose.model('Playlist', playlistSchema, "playlists");
module.exports = Playlist;