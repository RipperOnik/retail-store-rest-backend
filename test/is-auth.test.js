const authMiddleware = require('../middleware/isAuth')
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken')

describe('auth middleware', () => {
    test('should throw an error', () => {
        const req = {
            get: () => {
                return null
            }
        }
        expect(() => authMiddleware(req, {}, () => { })).toThrow('Unauthorized. Token is missing')
    })
    test('should throw an error if auth header is false', () => {
        const req = {
            get: (headerName) => {
                return 'zys'
            }
        }
        expect(() => authMiddleware(req, {}, () => { })).toThrow()
    })
    test('should return a userId after verification', () => {

        const mockedDecodedToken = {
            userId: 'someUserId'
        }
        const req = {
            get: (headerName) => {
                return 'Bearer sometoken'
            }
        }
        jwt.verify.mockReturnValue(mockedDecodedToken)
        // jwt.verify.mockImplementation(() => mockedDecodedToken)
        authMiddleware(req, {}, () => { })

        expect(req).toHaveProperty('userId', 'someUserId')
        expect(jwt.verify).toHaveBeenCalled()
        jwt.verify.mockRestore()
    })
})

