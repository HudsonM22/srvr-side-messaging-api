import jwt from 'jsonwebtoken'
import User from '../models/user.js'


export const authenticate = async (req) => {
    const authHeader = req.header('Authorization')
    if (!authHeader) {
        throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    // extract user id from token and verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (!decoded) {
        throw new Error('Jwt mismatch')
    }

    const user = await User.findById(decoded._id)

    if (!user) {
        throw new Error('Not a user')
    }

    if (!user.tokens.some((t) => t.token === token)) {
        throw new Error('Token not found for user')
    }

    return user
}

export const auth = async (req, res, next) => {
    try {
        const user = await authenticate(req)
        const authHeader = req.header('Authorization')
        const token = authHeader ? authHeader.replace('Bearer ', '') : undefined

        req.user = user
        req.token = token
        next()
    }
    catch (err) {
        res.status(401).send({ error: 'Please authenticate.' })
    }
}