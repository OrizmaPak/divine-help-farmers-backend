const express = require('express');
const { manageSavingsProduct } = require('../controllers/savings/products/manageproduct');
const router = express.Router();



// CREATE INVENTORY
router.route('/product') 
    .post(manageSavingsProduct)


    

module.exports = router; 