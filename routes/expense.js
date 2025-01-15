const express = require('express');
const allocateExpenditure = require('../controllers/expenses/allocate/allocateexpenditure');
const getTransactionsAndBalance = require('../controllers/expenses/allocate/getallocateexpenditure');
const approveDeclineAllocation = require('../controllers/expenses/allocate/approvedeclineallocation');
const { getAllPayables } = require('../controllers/expenses/payables/allpayables');
const { processSupplierPayout } = require('../controllers/expenses/supplierpayout/supplierpay');
const router = express.Router();



// CREATE INVENTORY
router.route('/allocate')
    .post(allocateExpenditure)
    .get(getTransactionsAndBalance)

router.route('/approvedeclineallocation')
    .post(approveDeclineAllocation)

router.route('/allpayables')
    .get(getAllPayables)

router.route('/payout')
    .post(processSupplierPayout)



    

module.exports = router; 