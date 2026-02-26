const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/playlist.controller');
const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

route.get('/all-playlists', controller.getAllPlaylists);

route.post("/create", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, controller.delete);

module.exports = route;