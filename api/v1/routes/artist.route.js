const express = require('express');
const route = express.Router();

// const { verifyToken } = require('../middleware/checkAdmin');
const controller = require('../controllers/artist.controller');

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

// 4. LẤY NHẠC CỦA NGHỆ SĨ
route.get('/:id/top', controller.getSongs);

module.exports = route;