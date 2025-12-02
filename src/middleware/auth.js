import jwt from 'jsonwebtoken'
import User from '../models/user.js'

export const authenticate = async (req) => {
    const authHeader = req.header('Authorization')
    if (!authHeader) {
        throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    //extract user id from token
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