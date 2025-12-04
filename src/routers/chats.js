import Router from 'express'
import User from './models/User.js'
import Chat from '../models/Chat.js'
import MessageBuckets from '../models/MessageBuckets.js'
import { auth } from '../middleware/auth.js'

const router = new Router()

//! TODO must fix auth middleware. and integrate friends with chats.
//create chat
router.post('/chat', auth, async (req, res) => {

})

export default router