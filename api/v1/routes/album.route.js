const express = require('express');
const route = express.Router();
const multer = require("multer");

// const { verifyToken } = require('../middleware/checkAdmin');
const controller = require('../controllers/album.controller');

const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

// 5. LẤY NHẠC TRONG ALBUM (MỚI)
route.get('/:id/tracks', controller.getSongs);

route.get("/all-albums", controller.getAllAlbums);

route.post("/create", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.delete);

module.exports = route;