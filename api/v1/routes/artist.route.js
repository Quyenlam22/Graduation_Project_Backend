const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/artist.controller');

const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

// 4. LẤY NHẠC CỦA NGHỆ SĨ
route.get('/:id/top', controller.getSongs);

route.get("/all-artists", controller.getAllArtists);

route.post("/create", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.delete);

module.exports = route;