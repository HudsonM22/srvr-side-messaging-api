import Router from 'express'
import User from '../models/user.js'
import { connect } from 'mongoose'
import { authenticate } from '../../middleware/auth.js'

const router = new Router()

router.post('/user/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findByCredentials(username, password)
        const token = user.generateJWT()
        await user.save()
        res.send({ user: user.getUser(), token })
    } catch (e) {
        res.status(400).send({ error: 'Unable to login' })
    }
})

router.post('/user/register', async (req, res) => {
    try {
        const user = new User(req.body)
        await user.save()
        const token = user.generateJWT()
        await user.save()
        res.status(201).send({ user: user.getUser(), token })
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.get('/user', async (req, res) => {
    try {
        const user = await authenticate(req)

        const userData = {
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            id: user._id
        }
        res.send({ user: userData })
    } catch (e) {
        res.status(401).send({ error: e.message })
    }
})

router.post('/user/logout', async (req, res) => {
    try {
        const user = await authenticate(req) //I put the middleware here but i wasnt entirely sure if this is correct
        const authHeader = req.header('Authorization')
        const token = authHeader.replace('Bearer ', '')

        user.tokens = user.tokens.filter((t) => t.token === token)
        await user.save()

        res.send()
    } catch (e) {
        res.status(401).send({ error: e.message })
    }
})

router.patch('/user', async (req, res) => {
    try {
        const user = await authenticate(req)
        const updates = Object.keys(req.body)
        const allowedUpdates = ['username', 'firstname', 'lastname', 'password']
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
 
        if (!isValidOperation) {
            return res.status(400).send({ error: 'Invalid updates' })
        }

        updates.forEach((update) => user[update] = req.body[update])
        await user.save()
        res.send({ user: user.getUser() })
    } catch (e) {
        if (e.code === 11000) {
            return res.status(409).send({ error: 'Username already in use' })
        }
        
        res.status(400).send({ error: e.message })
    }
})

router.delete('/user', async (req, res) => {
    try {
        const user = await authenticate(req)
        await user.remove()
        res.status(204).send()
    } catch (e) {
        res.status(401).send({ error: e.message })
    }
})

//GET /users?search=Joe&skip=10&limit=10&sortBy=email:asc
router.get('/users', async (req, res) => {
    try {
        await authenticate(req)

        let search = req.query?.search || ''

        const escapedTerm = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const filter = {
            username: { $regex: escapedTerm, $options: 'i' }
        }

        //1 means include it, -1 means exclude it.
        const pipeline = User.aggregate([
            { $match: filter },
            { $project: {
                    "_id": 1,
                    "username": 1,
                    "firstname": 1,
                    "email": 1
            } 
            }
        ])

        if (req.query.skip) {
            pipeline.append({ $skip: parseInt(req.query.skip) })
        }

        if (req.query.limit) {
            pipeline.append({ $limit: parseInt(req.query.limit) })
        }

        if (req.query.sortBy) {
            const parts = req.query.sortBy.split(':')
            const sort = {}
            sort[parts[0]] = (parts[1] === 'asc') ? 1 : -1
            pipeline.append({ $sort: sort })
        }

        try{
            const users = await pipeline.exec()
            res.send(users)
        }catch(e){
            res.status(400).send({ error: e.message })
        }
    } catch (e) {
        res.status(403).send({ error: e.message })
    }
})


export default router