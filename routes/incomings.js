const express = require('express');
const { saveGmailDataToFile } = require('../controllers/incomings/gmail/gmail');
const { saveMailDataToFile } = require('../controllers/incomings/fidelitytransactions/emails');
const { getfiletoobj } = require('../controllers/incomings/datacollection/filetojson');
const { saveDataToGoogleSheet, getDataByPhoneNumber, getAllDataFromGoogleSheet, updateBalances, getMatchingPhoneNumbers } = require('../controllers/incomings/datacollection/datatoexcel');
const router = express.Router();



// CREATE INVENTORY
router.route('/gmail')
    .post(saveGmailDataToFile)
router.route('/fidelity')
    .post(saveMailDataToFile)
router.route('/filetojson')
    .post(getfiletoobj)
router.route('/jsontosheet')
    .post(saveDataToGoogleSheet)
router.route('/getdatabyphonenumber')
    .get(getDataByPhoneNumber)
router.route('/getalldata') 
    .get(getAllDataFromGoogleSheet)
router.route('/numbertoname')
    .get(getMatchingPhoneNumbers)
router.route('/filetojsonbalance')
    .post(updateBalances)


    

module.exports = router; 