const express = require('express');
const { saveOrUpdateLevel } = require('../controllers/personnel/level/managelevel');
const { getLevel } = require('../controllers/personnel/level/getlevel');
const { saveOrUpdateGuarantor } = require('../controllers/personnel/guarantor/manage');
const { getGuarantors } = require('../controllers/personnel/guarantor/getguarantor');
const { deleteGuarantor } = require('../controllers/personnel/guarantor/deleteguarantor');
const { deleteLevel } = require('../controllers/personnel/level/deletelevel');
const { saveOrUpdateEmploymentRecord } = require('../controllers/personnel/employmentrecord/manage');
const { getEmploymentRecords } = require('../controllers/personnel/employmentrecord/get');
const { deleteEmploymentRecord } = require('../controllers/personnel/employmentrecord/delete');
const router = express.Router();




router.route('/level')
    .post(saveOrUpdateLevel) 
    .get(getLevel)
    .delete(deleteLevel)

router.route('/guarantor')
    .post(saveOrUpdateGuarantor)
    .get(getGuarantors)
    .delete(deleteGuarantor)

router.route('/employmentrecord')
    .post(saveOrUpdateEmploymentRecord)
    .get(getEmploymentRecords)
    .delete(deleteEmploymentRecord)


 
module.exports = router; 