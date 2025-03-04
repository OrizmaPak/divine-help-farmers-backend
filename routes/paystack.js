const express = require('express');
const { paystackWebhook } = require('../controllers/paystack/webhook');
const { getBankList } = require('../controllers/paystack/banklist');
const { resolveAccountNumber } = require('../controllers/paystack/resolveaccount');
const { getPaystackBalance } = require('../controllers/paystack/balance');
const router = express.Router();



// CREATE INVENTORY
router.route('/webhook')
    .post(paystackWebhook)

router.route('/banklist')   
    .get(getBankList)

router.route('/resolveaccount')
    .get(resolveAccountNumber)

router.route('/getbalance')
    .get(getPaystackBalance) 



    

module.exports = router;     