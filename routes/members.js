const express = require('express');
const { registeruser } = require('../controllers/member/registeruser/create');
const { getUsers } = require('../controllers/member/getmembers/getmembers');
const router = express.Router();



// CREATE INVENTORY
router.route('/userregistration')
    .post(registeruser)
    .get(getUsers)


    

module.exports = router;