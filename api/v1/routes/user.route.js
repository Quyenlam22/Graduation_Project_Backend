const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/user.controller');
const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin');
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

route.get("/all-users", verifyToken, controller.getAllUsers);

route.post('/register', verifyToken, controller.register);

route.get('/:uid', verifyToken, controller.getInfo);

route.post('/status', verifyToken, controller.changeStatus);

route.patch('/update-profile', verifyToken, upload.single("photoURL"), uploadCloud.uploadSingle, controller.updateProfile);

route.post("/create-admin", verifyToken, isAdmin, controller.createAdmin);

route.patch(
  "/update/:uid",
  verifyToken,
  isAdmin,
  multer().single("photoURL"),
  uploadCloud.uploadSingle,
  controller.updateUser
);

route.delete("/delete/:uid", verifyToken, isAdmin, controller.deleteUser);

route.post("/toggle-favorite", verifyToken, controller.toggleFavorite);

module.exports = route;