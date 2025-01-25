const express = require('express');
const { saveCompositeDetails } = require('../controllers/property/buildproperty/compositedetails');
const { getCompositeDetails } = require('../controllers/property/buildproperty/getcompositedetails');
const { saveOrUpdateCategoryTimeline } = require('../controllers/property/categorytimeline/categorytimeline');
const { getCategoryTimeline } = require('../controllers/property/categorytimeline/getcategorytimeline');
const { saveOrUpdatePropertyProduct } = require('../controllers/property/product/manageproduct');
const { getPropertyProduct } = require('../controllers/property/product/getproduct');
const { deleteCategoryTimeline } = require('../controllers/property/categorytimeline/deletecategorytimeline');
const { createPropertyAccount } = require('../controllers/property/account/manageaccount');
const { getPropertyAccount } = require('../controllers/property/account/getaccount');
const { getMaturedPropertyAccount } = require('../controllers/property/maturedaccount/getmaturedaccount');
const router = express.Router();



// CREATE INVENTORY
router.route('/buildproperty')
    .post(saveCompositeDetails)
    .get(getCompositeDetails)

router.route('/categorytimeline')
    .post(saveOrUpdateCategoryTimeline)
    .get(getCategoryTimeline)
    .delete(deleteCategoryTimeline)

router.route('/product')
    .post(saveOrUpdatePropertyProduct)
    .get(getPropertyProduct)

router.route('/account')
    .post(createPropertyAccount)
    .get(getPropertyAccount)

router.route('/maturedaccount')
    .get(getMaturedPropertyAccount)



    

module.exports = router;