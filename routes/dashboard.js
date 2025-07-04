const express = require('express');
const { listMemberships } = require('../controllers/dashboard/member/listmembership');
const { getMemberSavings } = require('../controllers/dashboard/member/savings');
const { getMemberPropertyAccounts } = require('../controllers/dashboard/member/property');
const { getMemberLoanAccounts } = require('../controllers/dashboard/member/loan');
const { getMemberRotaryAccounts } = require('../controllers/dashboard/member/rotary');
const { getPersonalAccountDetails } = require('../controllers/dashboard/member/personal');
const { getAccountYearlyTransactions } = require('../controllers/dashboard/member/nettransaction/account');
const { getUserMemberSavingsMonthly } = require('../controllers/dashboard/member/nettransaction/savings');
const { getGLBalances } = require('../controllers/dashboard/admin/glbalance');
const { getDefaultAccountKeysAndNames } = require('../controllers/dashboard/admin/nettransactions/gllist');
const { getAssetsByKeys } = require('../controllers/dashboard/admin/nettransactions/dynamicnetgltransactions');
const { adminmeetingboardreport } = require('../controllers/dashboard/admin/adminboard');
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

router.route('/personal')
    .get(getPersonalAccountDetails);

router.route('/nettransactionaccount')
    .get(getAccountYearlyTransactions)

router.route('/netsavingstransaction')
    .get(getUserMemberSavingsMonthly)

router.route('/glbalance')
    .get(getGLBalances)

router.route('/gllist')
    .get(getDefaultAccountKeysAndNames)

router.route('/gltotalassets')
    .get(getAssetsByKeys)

router.route('/adminboardreport')
    .get(adminmeetingboardreport)

module.exports = router; 