const express = require('express');
const { getTransactions } = require('../controllers/transactions/get');
const { getBalance } = require('../controllers/transactions/getbalance');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .get(getTransactions)

router.route('/balance')
    .get(getBalance)

    

module.exports = router;