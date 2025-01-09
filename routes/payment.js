const express = require('express');
const { handleTransaction } = require('../controllers/payments/transaction');
const { performTransaction } = require('../middleware/transactions/performTransaction');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .post(handleTransaction)

router.route('/inner')
    .post(performTransaction)


    

module.exports = router;