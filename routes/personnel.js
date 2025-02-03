const express = require('express');
const { saveOrUpdateLevel } = require('../controllers/personnel/level/managelevel');
const { getLevel } = require('../controllers/personnel/level/getlevel');
const router = express.Router();




router.route('/level')
    .post(saveOrUpdateLevel) 
    .get(getLevel)

    
 
module.exports = router; 