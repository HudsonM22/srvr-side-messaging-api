import { model, Schema } from 'mongoose'

const messageBucketSchema = new Schema({
    startDate: {
        type: Date,
        required: false
    },
    endDate: {
        type: Date,
        required: false
    },
    size : {
        type: Number,
        required: true,
        default: 0
    },
    messages: {
        type: [
            {
                content: {
                    type: String,
                    required: true
                },
                timeStamp: {
                    type: Date,
                    required: true,
                    default: Date.now
                },
                sender: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                    required: true
                }
            }
        ],
        default: [],
        required: true
    }
})

messageBucketSchema.pre('save', function(next) {
    this.size = this.messages.length
    next()
})

const MessageBucket = model('MessageBucket', messageBucketSchema)
export default MessageBucket