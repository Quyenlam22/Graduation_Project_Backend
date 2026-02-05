const express = require('express');
const route = express.Router();
const multer = require("multer");

const controller = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/checkAdmin'); // Must login to call API
const uploadCloud = require("../middleware/uploadCloud.middleware");

const upload = multer();

// Endpoint đồng bộ User sang MongoDB
route.post('/register', verifyToken, controller.register);

// Endpoint lấy thông tin User (bao gồm Role)
route.get('/:uid', verifyToken, controller.getInfo);

// API cập nhật trạng thái (Online/Offline)
route.post('/status', verifyToken, controller.changeStatus);

route.patch('/update-profile', verifyToken, upload.single("photoURL"), uploadCloud.uploadSingle, controller.updateProfile);

module.exports = route;