const express = require('express');
const { createOrUpdateVideo } = require('../controllers/video/create');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .post(createOrUpdateVideo)



    

module.exports = router;     