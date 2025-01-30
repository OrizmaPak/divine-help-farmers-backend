const express = require('express');
const { saveOrUpdateRotaryProduct } = require('../controllers/rotary/product/mange');
const { getRotaryProduct } = require('../controllers/rotary/product/getproduct');
const router = express.Router();



// CREATE INVENTORY
router.route('/product')
    .post(saveOrUpdateRotaryProduct)
    .get(getRotaryProduct)


    

module.exports = router; 