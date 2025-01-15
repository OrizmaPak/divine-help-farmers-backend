const express = require('express');
const allocateExpenditure = require('../controllers/expenses/allocate/allocateexpenditure');
const getTransactionsAndBalance = require('../controllers/expenses/allocate/getallocateexpenditure');
const approveDeclineAllocation = require('../controllers/expenses/allocate/approvedeclineallocation');
const { getAllPayables } = require('../controllers/expenses/payables/allpayables');
const router = express.Router();



// CREATE INVENTORY
router.route('/allocate')
    .post(allocateExpenditure)
    .get(getTransactionsAndBalance)

router.route('/approvedeclineallocation')
    .post(approveDeclineAllocation)

router.route('/allpayables')
    .get(getAllPayables)



    

module.exports = router; 