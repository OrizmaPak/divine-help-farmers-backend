const express = require('express');
const { paystackWebhook } = require('../controllers/paystack/webhook');
const router = express.Router();



// CREATE INVENTORY
router.route('/webhook')
    .post(paystackWebhook)



    

module.exports = router;     