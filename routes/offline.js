const express = require('express');
const { getofflineready } = require('../controllers/offline/getready');
const { offlineProcessCollection } = require('../controllers/offline/submitpayments');
const router = express.Router();



// CREATE INVENTORY
router.route('/getready')
    .get(getofflineready)

router.route('/submitpayments')
    .post(offlineProcessCollection)


    

module.exports = router;    