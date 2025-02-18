const express = require('express');
const { listMemberships } = require('../controllers/dashboard/member/listmembership');
const { getMemberSavings } = require('../controllers/dashboard/member/savings');
const { getMemberPropertyAccounts } = require('../controllers/dashboard/member/property');
const { getMemberLoanAccounts } = require('../controllers/dashboard/member/loan');
const { getMemberRotaryAccounts } = require('../controllers/dashboard/member/rotary');
const router = express.Router();

// BRANCH MANAGEMENT
router.route('/membership')
    .get(listMemberships);

router.route('/savings')
    .get(getMemberSavings);

router.route('/property')
    .get(getMemberPropertyAccounts);

router.route('/loan')
    .get(getMemberLoanAccounts);

router.route('/rotary')
    .get(getMemberRotaryAccounts)

module.exports = router; 