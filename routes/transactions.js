const express = require('express');
const { getTransactions } = require('../controllers/transactions/get');
const { getBalance } = require('../controllers/transactions/getbalance');
const { getaccountTransactions } = require('../controllers/transactions/getanaccount');
const { getAccountType } = require('../controllers/transactions/collections/getaccounttype');
const { processCollection } = require('../controllers/transactions/collections/collections');
const { getBankTransactions } = require('../controllers/transactions/getbank');
const { route } = require('./loan');
const { getUserMonthlyCollection } = require('../controllers/transactions/collections/getusermonthlycollection');
const { getUserYearlyCollection } = require('../controllers/transactions/collections/getuseryearlycollection');
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

router.route('/collection')
    .post(processCollection)

router.route('/collection/usermonthly')
    .get(getUserMonthlyCollection)

router.route('/collection/useryearly')
    .get(getUserYearlyCollection)

router.route('/bank') 
    .get(getBankTransactions)




     

module.exports = router;