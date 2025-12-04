import { model, Schema } from 'mongoose'

const messageBucketSchema = new Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    size : {
        type: Number,
        required: true,
        default: 0
    },
    messages: [
        {
            content: {
                type: String,
                required: true
            },
            timeStamp: {
                type: Date,
                required: true
            },
            sender: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        }
    ]
})

messageBucketSchema.pre('save', function(next) {
    this.size = this.messages.length
    next()
})

const MessageBucket = model('MessageBucket', messageBucketSchema)
export default MessageBucket