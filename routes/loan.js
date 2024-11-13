const express = require('express');
const { manageLoanFee } = require('../controllers/loan/fee/manage');
const { getLoanFees } = require('../controllers/loan/fee/getfee');
const { manageLoanProduct } = require('../controllers/loan/product/manage');
const router = express.Router();



// CREATE INVENTORY
router.route('/fee')
    .post(manageLoanFee)
    .get(getLoanFees)

router.route('/product')
    .post(manageLoanProduct)

    

module.exports = router;