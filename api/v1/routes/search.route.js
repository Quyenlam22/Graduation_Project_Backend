const express = require('express');
const route = express.Router();

const controller = require("../controllers/search.controller");

route.get('/external', controller.external);

module.exports = route;