const express = require('express');
const { getAllBranchesAndSendMeetingDates } = require('../controllers/landingwebsite/meetingtable');
const router = express.Router();



// CREATE INVENTORY
router.route('/meetingtable')
    .get(getAllBranchesAndSendMeetingDates)

module.exports = router;