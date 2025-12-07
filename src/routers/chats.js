import Router from 'express'
import User from '../models/user.js'
import { auth } from '../middleware/auth.js'
import chatManager from '../utils/chatManager.js'

const router = new Router()


//create chat
router.post('/chat', auth, async (req, res) => {
    const user = req.user
    const { name } =  req.body
    if (!name) {
        res.status(400).send('Chat name is required')
        return
    }
    
    const chatMgr = new chatManager()

    try {
        const chat = await chatMgr.createChat(user, name)
        res.status(201).send(chat)
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.post('/chat/:chatId/invitation/:userId', auth, async (req, res) => {
    const receiverId = req.params.userId
    const chatId = req.params.chatId
    const sender = req.user

    const receiver = await User.findById(receiverId)
    if (!receiver) {
        res.status(404).send('Receiver not found')
        return
    }

    const chatMgr = new chatManager()
    try {
        await chatMgr.inviteMemberToChat(receiver, sender, chatId, res)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

router.patch('/chat/:chatId/invitation/:requestId', auth, async (req, res) => {
    const chatId = req.params.chatId
    const requestId = req.params.requestId
    const eventType = req?.query?.accept === 'true' ? 'accept' : 'decline'
    const recipientUser = req.user

    const chatMgr = new chatManager()
    try{
        await chatMgr.acceptOrDeclineinvite(recipientUser, requestId, chatId, eventType, res)
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.delete('/chat/:chatId/membership', auth, async (req, res) => {
    const user = req.user
    const chatId = req.params.chatId
    
    const chatMgr = new chatManager()
    try {
        await chatMgr.leaveChat(user, chatId, res)
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.post('/chat/:chatId/message', auth, async (req, res) => {
    const chatId = req.params.chatId
    const user = req.user
    const content = req.body.content

    const chatMgr = new chatManager()
    try {
        await chatMgr.sendMessage(chatId, user, content, res)
    }catch (err) {
        res.status(500).send(err.message)
    }
})

router.get('/chat/:chatId/messages', auth, async (req, res) => {
    const chatId = req.params.chatId
    const user = req.user

    const chatMgr = new chatManager()
    try {
        await chatMgr.getChatMessages(chatId, user, req, res)
    }catch (err) {
        res.status(500).send(err.message)
    }
})

export default router