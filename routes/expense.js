const express = require('express');
const allocateExpenditure = require('../controllers/expenses/allocate/allocateexpenditure');
const getTransactionsAndBalance = require('../controllers/expenses/allocate/getallocateexpenditure');
const router = express.Router();



// CREATE INVENTORY
router.route('/allocate')
    .post(allocateExpenditure)
    .get(getTransactionsAndBalance)
    

module.exports = router;