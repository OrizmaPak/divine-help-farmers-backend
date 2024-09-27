const express = require('express');
const { registeruser } = require('../controllers/member/registeruser/create');
const router = express.Router();



// CREATE INVENTORY
router.route('/userregistration')
    .post(registeruser)


    

module.exports = router;