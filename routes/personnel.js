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
const { saveOrUpdateReferee } = require('../controllers/personnel/referee/manage');
const { getReferees } = require('../controllers/personnel/referee/get');
const { deleteReferee } = require('../controllers/personnel/referee/delete');
const { saveOrUpdateQualification } = require('../controllers/personnel/qualification/manage');
const { getQualifications } = require('../controllers/personnel/qualification/get');
const { deleteQualification } = require('../controllers/personnel/qualification/delete');
const { manageParentGuardian } = require('../controllers/personnel/parentguardian/manage');
const { getParentGuardians } = require('../controllers/personnel/parentguardian/get');
const { deleteParentGuardian } = require('../controllers/personnel/parentguardian/delete');
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

router.route('/referee')
    .post(saveOrUpdateReferee)
    .get(getReferees)
    .delete(deleteReferee)

router.route('/qualification')
    .post(saveOrUpdateQualification)
    .get(getQualifications)
    .delete(deleteQualification)

router.route('/parentguardians')
    .post(manageParentGuardian)
    .get(getParentGuardians)
    .delete(deleteParentGuardian)

 
module.exports = router; 