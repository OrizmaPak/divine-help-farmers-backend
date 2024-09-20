const express = require('express');
const { createInventory } = require('../controllers/inventory/createinventory/create');
const router = express.Router();



// BRANCH MANAGEMENT
router.route('/createinventory')
    .post(createInventory)

    

module.exports = router;