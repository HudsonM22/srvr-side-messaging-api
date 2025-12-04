import { model, Schema } from 'mongoose'

const chatSchema = new Schema({
    chatType: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    messageBuckets: {
        type: [Schema.Types.ObjectId],
        ref: 'MessageBucket',
        default: []
    },
    users: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        required: true
    },
    groupName: {
        type: String,
        required: function() {
            return this.chatType === 'group'
        },
        trim: true
    },
    owner: {
        type: {
            userID: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            username: {
                type: String,
                required: true
            }
        },
        required: function() {
            return this.chatType === 'group'
        }
    }
})

export default model('Chat', chatSchema)