const express = require('express');
const { listMemberships } = require('../controllers/dashboard/member/listmembership');
const { getMemberSavings } = require('../controllers/dashboard/member/savings');
const router = express.Router();

// BRANCH MANAGEMENT
router.route('/membership')
    .get(listMemberships);

router.route('/savings')
    .get(getMemberSavings);

module.exports = router; 