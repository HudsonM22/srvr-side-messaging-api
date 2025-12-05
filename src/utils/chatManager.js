import Chat from '../models/Chat.js'
import User from '../models/user.js'
import MessageBucket from '../models/MessageBucket.js'
import ChatInvite from '../models/ChatInvite.js'
import Requests from '../models/Request.js'

const bucketSizeLimit = 5 //max messages per bucket

class chatManager {

    // Create a new chat (private or group)
    createChat = async (user, name) => {
        const chat = new Chat({
            users: [user._id],
            groupName: name,
            owner: {
                userID: user._id,
                username: user.username
            }
        })
        await chat.save()
        return chat
    }

    //invite a member to a chat
    inviteMemberToChat = async (receiver, sender, chatId, res) => {
        const chat = await Chat.findById(chatId)
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }

        const chatInviteObj = {
                sender: { username: sender.username, userId: sender._id },
                receiver: { username: receiver.username, userId: receiver._id },
                kind: 'ChatInvite',
                chat: {
                    name: chat.name,
                    chatId: chat._id
                }
            }

        receiver.requests.push(chatInviteObj)
        await receiver.save()
    }

    acceptOrDeclineinvite = async (recipientUser, requestId, chatId, eventType, res) => {
        const request = Requests.findById(requestId)
        if (!request) {
            res.status(404).send('Request not found')
            return
        }

        const chat = await Chat.findById(chatId)
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }

        if(request.kind !== 'ChatInvite') {
            res.status(400).send('Request is not a chat invitation')
            return
        }

        chatIdFromRequest = request.chat.chatId
        if (!chatIdFromRequest.equals(chat._id)) {
            res.status(400).send('Request does not match chat')
            return
        }

        if (eventType === 'accept') {
            chat.users.push(recipientUser._id)
            await chat.save()
        }else if (eventType === 'decline') {
            //delete the request from the requests db and remove it from the persons request array
            for (let i = 0; i < recipientUser.requests.length; i++) {
                if (recipientUser.requests[i]._id.equals(requestId)) {
                    //deletes the request from the array of users
                    recipientUser.requests.splice(i, 1);
                    break;
                }
            }
            await recipientUser.save()

            await Chat.deleteOne({ _id: chat._id })
        }else {
            res.status(400).send('Invalid event type')
            return
        }
    }

    leaveChat = async (user, chatId, res) => {
        const chat = await Chat.findById(chatId)
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }
        if (chat.owner.userId.equals(user._id)) {
            res.status(400).send('Owner cannot leave the chat')
            return
        }
        chat.users = chat.users.filter(u => !u.equals(user._id))
        await chat.save()
    }

    sendMessage = async (chatId, user, content, res) => {
        const chat = await Chat.findById(chatId)
        //checks if chat exists
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }
        //checks if users in chat
        if (!chat.users.some(u => u.equals(user._id))) {
            res.status(403).send('User not in chat')
            return
        }
        content = content.trim()
        if (content.length === 0) {
            res.status(400).send('Message content cannot be empty')
            return
        }

        const currentBucketId = await chat.getCurrentMessageBucketId()
        //means no messages have been sent yet
        if (!currentBucketId) {
            const newBucket = await this.createBucket()
            newBucket.messages.push({
                sender: {
                    userID: user._id,
                    username: user.username
                },
                content: content
            })
            await newBucket.save()

            chat.messageBuckets.push(newBucket._id)
            await chat.save()
            return
        }

        const currentBucket = await MessageBucket.findById(currentBucketId)
        //check if bucket is full
        if (currentBucket.size >= bucketSizeLimit) {
            const newBucket = await this.createBucket()
            newBucket.messages.push({
                sender: {
                    userID: user._id,
                    username: user.username
                },
                content: content
            })
            await newBucket.save()

            //add new bucket to the front of the array
            chat.messageBuckets.unshift(newBucket._id)
            await chat.save()
            res.status(201).send("Message sent")
            return
        }
        //add message to current bucket
        currentBucket.messages.push({
            sender: {
                userID: user._id,
                username: user.username
            },
            content: content
        })
        await currentBucket.save()
        res.status(201).send("Message sent")
    }

    getChatMessages = async (chatId, user, req, res) => {
        let search = req.query?.search ?? ''

        //chcks if chat exists
        const chat = await Chat.findById(chatId)
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }
        //checks if users in chat
        const userId = user._id
        if (!chat.users.some(u => u.equals(userId))) {
            res.status(403).send('User not in chat')
            return
        }

        let result = []
        const messageBucketsId = chat.messageBuckets //array of message bucket ids
        result.append(...await this.searchAllBuckets(search, messageBucketsId))

    
        const skip = parseInt(req.query?.skip) || 0
        const limit = parseInt(req.query?.limit) || result.length
        
        result = result.slice(skip) //skips first n results
        result = result.slice(0, limit)
        res.status(200).send(result) //array of message object
    }
    
    //helper functions
    createBucket = async () => {
        const bucket = new MessageBucket({})
        await bucket.save()
        return bucket
    }

    getMessageBucket = async (bucketId) => {
        const bucket = messageBucket.findById(bucketId)
        return bucket
    }

    searchAllBuckets = async (searchTerm, bucketIds) => {
        return MessageBucket.aggregate([
            { $match: { _id: { $in: bucketIds } } },
            { $unwind: "$messages" },
            {
                $match: {
                    "messages.content": { $regex: searchTerm, $options: "i" }
                }
            },
            { $replaceRoot: { newRoot: "$messages" } }
        ])
    }

}
export default chatManager