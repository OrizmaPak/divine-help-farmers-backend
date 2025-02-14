const express = require('express');
const { getofflineready } = require('../controllers/offline/getready');
const router = express.Router();



// CREATE INVENTORY
router.route('/getready')
    .get(getofflineready)


    

module.exports = router;    