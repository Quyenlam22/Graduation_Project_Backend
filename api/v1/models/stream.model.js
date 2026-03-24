const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  songId: String, // ID của bài hát (Local ID hoặc Deezer ID)
  title: String,
  artistName: String,
  source: {
    type: String,
    enum: ['local', 'deezer'],
    default: 'local'
  },
  listenedAt: {
    type: Date,
    default: Date.now
  }
});

const Stream = mongoose.model("Stream", streamSchema, "streams");
module.exports = Stream;