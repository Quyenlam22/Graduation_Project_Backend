// routes/songRoutes.js
const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/song.controller');
const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

route.get('/all-songs', controller.getAllSongs);

route.post("/create", verifyToken, isAdmin, upload.single("cover"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("cover"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, controller.delete);

module.exports = route;