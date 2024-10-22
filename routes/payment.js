const express = require('express');
const { handleTransaction } = require('../controllers/payments/transaction');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .post(handleTransaction)


    

module.exports = router;