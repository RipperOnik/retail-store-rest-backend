const { validationResult } = require('express-validator/check');
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        error.errors = errors.array()
        throw error;
    }
    const { email, password, name } = req.body
    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email, password: hashedPassword, name
            })
            return user.save()
        })
        .then(result => {
            res.status(201).json({ message: 'User created', userId: result._id })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.login = (req, res, next) => {
    const { email, password } = req.body
    let loadedUser
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error('No user with the provided email')
                error.statusCode = 401
                throw error
            }
            loadedUser = user
            return bcrypt.compare(password, user.password)
        })
        .then(isEqual => {
            if (!isEqual) {
                const error = new Error('The password is incorrect')
                error.statusCode = 401
                throw error
            }
            // generate token
            const token = jwt.sign({
                email: loadedUser.email,
                userId: loadedUser._id.toString()
            },
                'superprivatekey', // private key
                { expiresIn: '1h' }
            )
            res.status(200).json({ token, userId: loadedUser._id.toString() })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}