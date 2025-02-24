const express = require('express');
const { deleteNotification } = require('../controllers/notification/deletenotice');
const { getNotificationsByUserId } = require('../controllers/notification/get');
const router = express.Router();



router.route('/getnotifications')
    .get(getNotificationsByUserId)
    
router.route('/delete')
    .delete(deleteNotification)


    

module.exports = router;  