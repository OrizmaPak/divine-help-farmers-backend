const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit');
const { signup } = require('../controllers/auth/signup');
const { login } = require('../controllers/auth/login');
const { changePassword } = require('../controllers/auth/changepassword');
const { forgotpassword } = require('../controllers/auth/forgotpassword');
const { profile } = require('../controllers/auth/profile');
const authMiddleware = require('../middleware/authentication');
const { sendverificationmail } = require('../controllers/auth/sendverificationmail');
const { signout } = require('../controllers/auth/signout');
const { verifypasswordtoken } = require('../controllers/auth/verifypasswordtoken');
const { verifyuser } = require('../controllers/auth/verifyuser');
const { testing } = require('../controllers/sample');
const { updateuser } = require('../controllers/auth/updateprofile');


router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/changepassword').post(changePassword);
router.route('/forgotpassword').post(forgotpassword);
router.route('/profile').get(authMiddleware, profile); 
router.route('/updateprofile').post(authMiddleware, updateuser); 
router.route('/sendverificationmail').post(authMiddleware, sendverificationmail); 
router.route('/signout').get(authMiddleware, signout); 
router.route('/verifypasswordtoken').get(verifypasswordtoken); 
router.route('/verifyuser').post(verifyuser); 
router.route('/testing').post(testing); 
 

// router.post('/login', login);
// router.patch('/updateUser', authenticateUser, testUser, updateUser);
module.exports = router;
