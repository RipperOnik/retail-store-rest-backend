const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
        const error = new Error('Unauthorized. Token is missing')
        error.statusCode = 401
        throw error
    }
    const token = authHeader.split(' ')[1]
    let decodedToken
    try {
        // verify also checks the token for its expiry date
        decodedToken = jwt.verify(token, 'superprivatekey')
    }
    // was not able to verify token 
    catch {
        const error = new Error('Unauthorized. Token is invalid')
        error.statusCode = 401
        throw error
    }
    if (!decodedToken) {
        const error = new Error('Unauthorized. Token is invalid')
        error.statusCode = 401
        throw error
    }
    req.userId = decodedToken.userId
    next()
}