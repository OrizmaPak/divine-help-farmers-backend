const express = require('express');
const { getTransactions } = require('../controllers/transactions/get');
const { getBalance } = require('../controllers/transactions/getbalance');
const { getaccountTransactions } = require('../controllers/transactions/getanaccount');
const { getAccountType } = require('../controllers/transactions/collections/getaccounttype');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .get(getTransactions)

router.route('/account')
    .get(getaccountTransactions)

router.route('/balance')
    .get(getBalance)

router.route('/getaccounttype')
    .get(getAccountType)


     

module.exports = router;