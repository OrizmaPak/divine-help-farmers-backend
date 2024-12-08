const express = require('express');
const { createInventory } = require('../controllers/inventory/createinventory/create');
const { getInventory } = require('../controllers/inventory/getinventory/getinventory');
const { openingStock } = require('../controllers/inventory/openingstock/openingstock');
const { updateImages } = require('../controllers/inventory/updateinventory/updateimages');
const { updateinventory } = require('../controllers/inventory/updateinventory/updateinventory');
const withTransaction = require('../middleware/monitortransactions');
const { requisition } = require('../controllers/inventory/requisition/requisition');
const { getpendingrequisition } = require('../controllers/inventory/requisition/pendingrequisition');
const { viewrequisition } = require('../controllers/inventory/requisition/viewrequisition');
const { updateRequisitionStatus } = require('../controllers/inventory/requisition/approvedecliinerequisition');
const { manageIssueType } = require('../controllers/inventory/Issuesandreturn/issuetype');
const { getIssueType } = require('../controllers/inventory/Issuesandreturn/getissuetype');
const { manageissuelog } = require('../controllers/inventory/Issuesandreturn/issuelog');
const { getissuelog } = require('../controllers/inventory/Issuesandreturn/getissuelog');
const { getStockLedger } = require('../controllers/inventory/report/getstockledger');
const { getStockValuation } = require('../controllers/inventory/report/stockvaluation');
const { updatemultipleinventory } = require('../controllers/inventory/updateinventory/updatemultipleinventory');
const { deleteinventory } = require('../controllers/inventory/updateinventory/deleteinventory');
const { harddeleteinventory } = require('../controllers/inventory/updateinventory/harddeleteinventory');
const router = express.Router();



// CREATE INVENTORY
router.route('/createinventory')
    .post(createInventory)

// GET INVENTORY
router.route('/getinventory')
.get(getInventory)

// OPENING STOCK
router.route('/openingstock')
    .post(openingStock)

// UPDATE INVENTORY
router.route('/update')
    .post(updateinventory)

router.route('/updatemultiple')
    .post(updatemultipleinventory)

router.route('/update/images')
    .post(updateImages)

router.route('/delete')
    .post(deleteinventory)
    // .post(harddeleteinventory)

// REQUISITION
router.route('/requisition')
    .post(requisition)
router.route('/requisition/pending')
    .get(getpendingrequisition)
router.route('/requisition/view')
    .get(viewrequisition)
router.route('/requisition/approvedecline')
    .post(updateRequisitionStatus)

// ISSUES AND RETURNS
// issue type
router.route('/issues/type')
    .post(manageIssueType)
    .get(getIssueType)
// issue log
router.route('/issues/log')
    .post(manageissuelog)
    .get(getissuelog)

// REPORTS
router.route('/report/stockledger')
    .get(getStockLedger)
router.route('/report/stockvaluation')
    .get(getStockValuation)
    








// TRANSACTIONS DESCRIPTIONS

// Creation with opening stock

// Opening Stuck

// Update details of the item


    

module.exports = router;