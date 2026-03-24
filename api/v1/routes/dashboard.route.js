const express = require('express');
const route = express.Router();

const controller = require('../controllers/dashboard.controller');

const {
  verifyToken,
  isAdmin
} = require('../middleware/checkAdmin');

route.get("/overview", verifyToken, isAdmin, controller.getStats);

module.exports = route;