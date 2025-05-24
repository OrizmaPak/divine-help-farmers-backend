const express = require('express');
const { deleteNotification } = require('../controllers/notification/deletenotice');
const { getNotificationsByUserId } = require('../controllers/notification/get');
const { sendSmsController } = require('../controllers/notification/sendSms');
const { sendMessage } = require('../controllers/notification/sendMessage');
const { sendLaunchSms } = require('../controllers/notification/sendlauchsms');
const router = express.Router();



router.route('/getnotifications')
    .get(getNotificationsByUserId)
    
router.route('/delete')
    .delete(deleteNotification)

router.route('/sendsms')
    .post(sendSmsController)

router.route('/sendmessage')
    .post(sendMessage)

router.route('/sendlauchsms')
    .post(sendLaunchSms)


    

module.exports = router;   