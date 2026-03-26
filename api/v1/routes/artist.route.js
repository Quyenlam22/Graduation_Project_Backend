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

route.get("/all-artists", controller.getAllArtists);

route.post("/create", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.create);

route.patch("/update/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.update);

route.delete("/delete/:id", verifyToken, isAdmin, upload.single("avatar"), uploadCloud.uploadSingle, controller.delete);

route.post("/get-artists-by-ids", controller.getArtistsByIds);

module.exports = route;