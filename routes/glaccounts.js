const express = require('express');
const { createOrUpdateAccount } = require('../controllers/glaccounts/manageaccount/manageaccount');
const router = express.Router();



// CREATE INVENTORY
router.route('/manageglaccounts')
    .post(createOrUpdateAccount);


    

module.exports = router;