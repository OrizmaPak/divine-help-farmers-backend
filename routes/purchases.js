const express = require('express');
const { manageSupplier } = require('../controllers/purchases/supplier/managesupplier');
const { getSupplier } = require('../controllers/purchases/supplier/getsupplier');
const { getPurchaseOrder } = require('../controllers/purchases/purchase order/getpurchaseorder');
const { managePurchaseOrder } = require('../controllers/purchases/purchase order/managepurchaseorder');
const { deletePurchaseOrder } = require('../controllers/purchases/purchase order/deletepurchaseorder');
const router = express.Router();



// CREATE INVENTORY
router.route('/supplier')
    .post(manageSupplier)
    .get(getSupplier)
router.route('/order')
    .post(managePurchaseOrder)
    .get(getPurchaseOrder)
    .delete(deletePurchaseOrder)


    

module.exports = router; 