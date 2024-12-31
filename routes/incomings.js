const express = require('express');
const { saveGmailDataToFile } = require('../controllers/incomings/gmail/gmail');
const { saveMailDataToFile } = require('../controllers/incomings/fidelitytransactions/emails');
const { getfiletoobj } = require('../controllers/incomings/datacollection/filetojson');
const router = express.Router();



// CREATE INVENTORY
router.route('/gmail')
    .post(saveGmailDataToFile)
router.route('/fidelity')
    .post(saveMailDataToFile)
router.route('/filetojson')
    .post(getfiletoobj)


    

module.exports = router; 