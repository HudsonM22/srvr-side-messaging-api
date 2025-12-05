import Router from 'express'
import User from './models/User.js'
import Chat from '../models/Chat.js'
import MessageBuckets from '../models/MessageBuckets.js'
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

    const receiver = User.findById(receiverId)
    if (!reciever) {
        res.status(404).send('Receiver not found')
        return
    }

    const chatMgr = new chatManager()
    try {
        chatMgr.inviteMemberToChat(receiver, sender, chatId, res)
        res.status(200).send('Invitation sent')
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.patch('/chat/:chatId/invitation/:requestId ?accept=[true|false]', auth, async (req, res) => {
    const chatId = req.params.chatId
    const requestId = req.params.requestId
    const eventType = req.query.accept === 'true' ? 'accept' : 'decline'
    const recipientUser = req.user

    const chatMgr = new chatManager()
    try{
        chatMgr.acceptOrDeclineinvite(recipientUser, requestId, chatId, eventType, res)
        res.status(200).send('Invitation processed')
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.delete('/chat/:chatId/membership', auth, async (req, res) => {
    const user = req.user
    const chatId = req.params.chatId
    
    const chatMgr = new chatManager()
    try {
        chatMgr.leaveChat(user, chatId, res)
        res.status(200).send('User left chat')
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
        await chatMgr.sendMessageToChat(chatId, user, content, res)
        res.status(200).send('Message Sent')
    }catch (err) {
        res.status(500).send('Server error')
    }
})

router.get('/chat/:chatId/messages ?limit=#&offset=# &search=string', auth, async (req, res) => {
    const chatId = req.params.chatId
    const user = req.user

    const chatMgr = new chatManager()
    try {
        await chatMgr.getMessagesFromChat(chatId, user, req, res)
    }catch (err) {
        res.status(500).send('Server error')
    }
})

export default router