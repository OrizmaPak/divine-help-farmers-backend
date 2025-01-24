const express = require('express');
const { saveCompositeDetails } = require('../controllers/property/buildproperty/compositedetails');
const { getCompositeDetails } = require('../controllers/property/buildproperty/getcompositedetails');
const { saveOrUpdateCategoryTimeline } = require('../controllers/property/categorytimeline/categorytimeline');
const { getCategoryTimeline } = require('../controllers/property/categorytimeline/getcategorytimeline');
const { saveOrUpdatePropertyProduct } = require('../controllers/property/product/manageproduct');
const router = express.Router();



// CREATE INVENTORY
router.route('/buildproperty')
    .post(saveCompositeDetails)
    .get(getCompositeDetails)

router.route('/categorytimeline')
    .post(saveOrUpdateCategoryTimeline)
    .get(getCategoryTimeline)

router.route('/product')
    .post(saveOrUpdatePropertyProduct)



    

module.exports = router;