const express = require('express');
const { getVideos } = require('../controllers/video/get');
const { createOrUpdateVideo } = require('../controllers/video/create');
const router = express.Router();



// CREATE INVENTORY
router.route('/')
    .post(createOrUpdateVideo)
    .get(getVideos)



    

module.exports = router;     