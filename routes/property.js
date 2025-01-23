const express = require('express');
const { saveCompositeDetails } = require('../controllers/property/buildproperty/compositedetails');
const { getCompositeDetails } = require('../controllers/property/buildproperty/getcompositedetails');
const router = express.Router();



// CREATE INVENTORY
router.route('/buildproperty')
    .post(saveCompositeDetails)
    .get(getCompositeDetails)



    

module.exports = router;