const express = require('express');
const { generateTextController } = require('../controllers/ai/ai');
const router = express.Router();



// CREATE INVENTORY
router.route('/testai')
    .post(generateTextController)


    

module.exports = router;