import Chat from '../models/Chat.js'
import User from '../models/user.js'
import MessageBucket from '../models/MessageBucket.js'
import ChatInvite from '../models/ChatInvite.js'


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

    
}

export default chatManager