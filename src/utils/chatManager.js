import e from 'express'
import Chat from '../models/Chat.js'
import MessageBucket from '../models/MessageBuckets.js'
import Requests from '../models/Requests.js'

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

        if (!chat.users.some(u => u.equals(sender._id))) {
            res.status(403).send('Sender not in chat')
            return
        }

        const chatInviteObj = {
                sender: { username: sender.username, userId: sender._id },
                receiver: { username: receiver.username, userId: receiver._id },
                kind: 'ChatInvite',
                chat: {
                    name: chat.groupName,
                    chatId: chat._id
                }
            }


        const chatInviteRequest = new Requests(chatInviteObj);
        if(receiver.requests.some(req => req.chat.chatId.equals(chatId) && req.kind === 'ChatInvite')) {
            res.status(400).send('Invite request already sent to this user for this chat');
            return;
        }

        if(chat.users.some(u => u.equals(receiver._id))) {
            res.status(400).send('User is already a member of the chat');
            return;
        }
        receiver.requests.push(chatInviteRequest);
        await receiver.save();
        res.status(200).send(receiver.requests);
    }

    acceptOrDeclineinvite = async (recipientUser, requestId, chatId, eventType, res) => {
        try{
            
            const chat = await Chat.findById(chatId)
            if (!chat) {
                res.status(404).send('Chat not found')
                return
            }

        

            const request = recipientUser.requests.find(element => element._id.equals(requestId));
            if (!request) {
                res.status(404).send('Request not found');
                return;
            }


            if (!chat._id.equals(request.chat.chatId)) {
                res.status(400).send('Request does not match chat')
                return
            }

            if (eventType === 'accept') {
                if (chat.users.some(u => u.equals(recipientUser._id))) {
                    res.status(400).send('User already in chat')
                    return
                }
                chat.users.push(recipientUser._id)
                await chat.save()

                //deletes the request from the persons request array
                recipientUser.requests = recipientUser.requests.filter(element => !element._id.equals(requestId));
                await recipientUser.save()
                res.status(200).send('Invitation accepted added to chat: ' + chat.groupName)
            }else if (eventType === 'decline') {
                //delete the request from the requests db and remove it from the persons request array
                for (let i = 0; i < recipientUser.requests.length; i++) {
                    if (recipientUser.requests[i]._id.equals(requestId)) {
                        //deletes the request from the array of requests
                        recipientUser.requests.splice(i, 1);
                        break;
                    }
                }
                await recipientUser.save()
                res.status(200).send('Invitation declined')
            }else {
                res.status(400).send('Invalid event type')
                return
            }
        }catch (err) {
            res.status(500).send(err.message)
        }
    }

    leaveChat = async (user, chatId, res) => {
        const chat = await Chat.findById(chatId)
        
        if (!chat) {
            res.status(404).send('Chat not found')
            return
        }
        if (!chat.users.find(u => u.equals(user._id))) {
            res.status(403).send('User not in chat')
            return
        } 
        if (chat.owner.userID.equals(user._id)) {
            res.status(400).send('Owner cannot leave the chat')
            return
        }
        chat.users = chat.users.filter(u => !u.equals(user._id))
        await chat.save()
        res.status(200).send('User left chat')
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
                sender: user._id,
                content: content
            });
            await newBucket.save();

            chat.messageBuckets.push(newBucket._id)
            await chat.save();
            return;
        }

        const currentBucket = await MessageBucket.findById(currentBucketId)
        //check if bucket is full
        if (currentBucket.size >= bucketSizeLimit) {
            const newBucket = await this.createBucket()
            newBucket.messages.push({
                sender: user._id,
                content: content
            });
            await newBucket.save()

            //add new bucket to the front of the array
            chat.messageBuckets.unshift(newBucket._id)
            await chat.save()
            res.status(201).send("Message sent")
            return;
        }
        //add message to current bucket
        currentBucket.messages.push({
            sender: user._id,
            content: content
        });
        await currentBucket.save();
        res.status(201).send("Message sent");
    }

    getChatMessages = async (chatId, user, req, res) => {
        let search = req.query?.search ?? ''

        //checks if chat exists
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


        const skip = parseInt(req.query?.offset) || null
        const limit = parseInt(req.query?.limit) || null
        let result = []
        const messageBucketsId = chat.messageBuckets //array of message bucket ids
        result.push(...await this.pipelineAllBuckets(search, messageBucketsId, limit, skip))

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

    pipelineAllBuckets = async (searchTerm, bucketIds, limit, skip) => {
        const pipeline = [
            { $match: { _id: { $in: bucketIds } } },
            { $unwind: "$messages" },
            {
                $match: {
                    "messages.content": { $regex: searchTerm, $options: "i" }
                }
            },
            { $replaceRoot: { newRoot: "$messages" } },
        ]
        if (skip !== null) {
            pipeline.push({ $skip: skip })
        }
        if (limit !== null) {
            pipeline.push({ $limit: limit })
        }
        return MessageBucket.aggregate(pipeline)
    }
}
export default chatManager