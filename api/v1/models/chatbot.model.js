const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "model"],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  imageUrl: { type: String },
  // userId: {
  //   type: String,
  //   required: false
  // },
}, {
  timestamps: true
});

const Chat = mongoose.model("Chat", chatSchema, "chatbot");

module.exports = Chat;