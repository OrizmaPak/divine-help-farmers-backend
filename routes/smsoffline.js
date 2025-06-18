const express = require('express');
const { receiveSms } = require('../controllers/smsoffline/receivesms');
const router = express.Router();



router.route('/receivesms') 
    .post(receiveSms)
    

module.exports = router; 