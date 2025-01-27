const express = require('express');
const { makesales } = require('../controllers/sales/makesales');
const router = express.Router();



// CREATE INVENTORY
router.route('/makesales')
    .post(makesales)

    

module.exports = router; 