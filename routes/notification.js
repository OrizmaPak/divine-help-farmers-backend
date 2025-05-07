const express = require('express');
const { deleteNotification } = require('../controllers/notification/deletenotice');
const { getNotificationsByUserId } = require('../controllers/notification/get');
const { sendSmsController } = require('../controllers/notification/sendSms');
const router = express.Router();



router.route('/getnotifications')
    .get(getNotificationsByUserId)
    
router.route('/delete')
    .delete(deleteNotification)

router.route('/sendsms')
    .post(sendSmsController)


    

module.exports = router;  