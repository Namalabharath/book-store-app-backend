const express = require('express');
const { createAOrder, getOrderByEmail, getAllOrders } = require('./order.controller');
const { verifyUserToken, verifyAdminToken } = require('../middleware/verifyAdminToken');

const router =  express.Router();

// create order endpoint - requires authentication
router.post("/", verifyUserToken, createAOrder);

// get orders by user email - requires authentication
router.get("/email/:email", verifyUserToken, getOrderByEmail);

// get all orders (admin only)
router.get("/", verifyAdminToken, getAllOrders);

module.exports = router;