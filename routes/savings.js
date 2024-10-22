const express = require('express');
const { manageSavingsProduct } = require('../controllers/savings/products/manageproduct');
const { getSavingsProducts } = require('../controllers/savings/getproduct/getproducts');
const { manageSavingsAccount } = require('../controllers/savings/createaccount/createaccount');
const { getAccounts } = require('../controllers/savings/getaccount/getaccount');
const router = express.Router();



// CREATE INVENTORY
router.route('/product') 
    .post(manageSavingsProduct)
    .get(getSavingsProducts);

router.route('/account') 
    .post(manageSavingsAccount)
    .get(getAccounts);

    

module.exports = router; 