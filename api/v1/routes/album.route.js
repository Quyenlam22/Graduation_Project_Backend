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

route.get('/:id/tracks', controller.getSongs);

route.get("/all-albums", controller.getAllAlbums);

route.post("/create", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.delete);

route.post("/get-albums-by-ids", controller.getAlbumsByIds);

module.exports = route;