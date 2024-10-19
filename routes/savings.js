const express = require('express');
const { manageSavingsProduct } = require('../controllers/savings/products/manageproduct');
const { getSavingsProducts } = require('../controllers/savings/getproduct/getproducts');
const { manageSavingsAccount } = require('../controllers/savings/createaccount/createaccount');
const router = express.Router();



// CREATE INVENTORY
router.route('/product') 
.post(manageSavingsProduct)
.get(getSavingsProducts);

router.route('/account') 
    .post(manageSavingsAccount)

    

module.exports = router; 