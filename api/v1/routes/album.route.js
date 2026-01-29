const express = require('express');
const route = express.Router();

// const { verifyToken } = require('../middleware/checkAdmin');
const controller = require('../controllers/album.controller');

// 1. TÌM KIẾM BÀI HÁT
route.get('/search', controller.search);

// 5. LẤY NHẠC TRONG ALBUM (MỚI)
route.get('/:id/tracks', controller.getSongs);

module.exports = route;