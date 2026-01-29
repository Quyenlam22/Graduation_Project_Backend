// routes/songRoutes.js
const express = require('express');
const route = express.Router();

// const { verifyToken } = require('../middleware/checkAdmin');
const controller = require('../controllers/song.controller');

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

module.exports = route;