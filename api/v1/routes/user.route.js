const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

route.get("/all-users", verifyToken, controller.getAllUsers);

// Endpoint đồng bộ User sang MongoDB
route.post('/register', verifyToken, controller.register);

// Endpoint lấy thông tin User (bao gồm Role)
route.get('/:uid', verifyToken, controller.getInfo);

// API cập nhật trạng thái (Online/Offline)
route.post('/status', verifyToken, controller.changeStatus);

route.patch('/update-profile', verifyToken, upload.single("photoURL"), uploadCloud.uploadSingle, controller.updateProfile);

route.post("/create-admin", verifyToken, isAdmin, controller.createAdmin);

module.exports = route;