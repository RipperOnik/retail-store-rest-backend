const express = require('express');
const { body } = require('express-validator/check');
const User = require('../models/user')

const authController = require('../controllers/auth');

const router = express.Router();

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Enter a valid email')
        .custom((value, { req }) => {
            return User.findOne({ email: value }).then(user => {
                if (user) {
                    return Promise.reject('Email had already been created')
                }
            })
        })
        .normalizeEmail(),
    body('password')
        .trim()
        .isLength(5)
        .withMessage('Enter a password with length more than 5'),
    body('name')
        .trim()
        .not()
        .isEmpty()
        .withMessage('Enter a name')
], authController.signup)

router.post('/login', authController.login)

module.exports = router;
