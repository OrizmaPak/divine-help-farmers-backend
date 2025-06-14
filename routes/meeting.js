const express = require('express');
const { meetingboardreport } = require('../controllers/meeting/meetingboard');
const router = express.Router();



// CREATE INVENTORY
router.route('/meetingboard')
    .get(meetingboardreport)


    

module.exports = router;  