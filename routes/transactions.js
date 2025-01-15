const express = require('express');
const { getTransactions } = require('../controllers/transactions/get');
const { getBalance } = require('../controllers/transactions/getbalance');
const { getaccountTransactions } = require('../controllers/transactions/getanaccount');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .get(getTransactions)

router.route('/account')
    .get(getaccountTransactions)

router.route('/balance')
    .get(getBalance)

    

module.exports = router;