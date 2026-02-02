const express = require('express');
const route = express.Router();

const controller = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/checkAdmin'); // Must login to call API

// Endpoint đồng bộ User sang MongoDB
route.post('/register', verifyToken, controller.register);

// Endpoint lấy thông tin User (bao gồm Role)
route.get('/:uid', verifyToken, controller.getInfo);

// API cập nhật trạng thái (Online/Offline)
route.post('/status', verifyToken, controller.changeStatus);

route.patch('/update-profile', verifyToken, controller.updateProfile);

module.exports = route;