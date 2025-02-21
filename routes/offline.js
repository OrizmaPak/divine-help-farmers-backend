const express = require('express');
const { getofflineready } = require('../controllers/offline/getready');
const { offlineProcessCollection } = require('../controllers/offline/submitpayments');
const { getDailyCodeAndPin } = require('../controllers/offline/offlineboard');
const authMiddleware = require('../middleware/authentication');
const router = express.Router();



// CREATE INVENTORY
router.route('/getready')
    .get(getofflineready)

router.route('/submitpayments')
    .post(offlineProcessCollection)

router.route('/offlinecodeandpin') 
    .get(authMiddleware, getDailyCodeAndPin)


    

module.exports = router;    