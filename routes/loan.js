const express = require('express');
const { manageLoanFee } = require('../controllers/loan/fee/manage');
const { getLoanFees } = require('../controllers/loan/fee/getfee');
const { manageLoanProduct } = require('../controllers/loan/product/manage');
const { getLoanProducts } = require('../controllers/loan/product/getproduct');
const { manageLoanAccount } = require('../controllers/loan/accounts/manage');
const { getLoanAccount } = require('../controllers/loan/accounts/getaccount');
const { getLoanAccountDetails } = require('../controllers/loan/accounts/getaccountdetails');
const router = express.Router();



// CREATE INVENTORY
router.route('/fee')
    .post(manageLoanFee)
    .get(getLoanFees)

router.route('/product')
    .post(manageLoanProduct)
    .get(getLoanProducts)

router.route('/account')
    .post(manageLoanAccount)
    .get(getLoanAccount)

router.route('/account/details')
    .post(getLoanAccountDetails)
    

module.exports = router;