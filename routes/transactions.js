const express = require('express');
const { getTransactions } = require('../controllers/transactions/get');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .get(getTransactions)

    

module.exports = router;