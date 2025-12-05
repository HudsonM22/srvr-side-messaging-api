import mongoose, { Schema } from "mongoose"
import validator from 'validator'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Request from "./requests"
import ChatInvite from "./ChatInvite"
import FriendRequest from "./FriendRequest"

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "must have username"],
        trim: true,
        minlength: [3, "min length is 3 chars"],
        unique: true
    },
    firstname: {
        type: String,
        required: [true, "must have firstname"],
        trim: true,
    },
    lastname: {
        type: String,
        required: [true, "must have lastname"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "must have email"],
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: (val) => validator.isEmail(val),
            message: "Must be a valid email address."
        }
    },
    password: {
        type: String,
        required: [true, "must have passsword"],
        trim: true,
        minlength: [8, "password must be more than 7 chars"],
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    requests: [ Request.schema ],
    friends: [
        {
        username: {
            type: String,
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true
        }
        }
    ]
})

Schema.Types.String.set('validate', {
    validator: (value) => value == null || value.length > 0,
    message: "String must be null or non-empty."
})
Schema.Types.String.set('trim', true)

userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        //hash the password before saving
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

userSchema.statics.findByCredentials = async (username, password) => {
    const user = await User.findOne({ username })
    if (!user) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        throw new Error('Unable to login')
    }

    return user
}

userSchema.methods.getUser = function() {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.__v
    delete userObject._id

    return userObject
}

userSchema.methods.generateJWT = function() {
    const user = this
    const token = jwt.sign(
        { _id: user._id.toString(), type: 'user' },
        process.env.JWT_SECRET
    )

    user.tokens = user.tokens.concat({ token })
    return token
}

userSchema.path('requests').discriminator('FriendRequest', FriendRequest.schema)
userSchema.path('requests').discriminator('ChatInvite', ChatInvite.schema)

const User = mongoose.model('User', userSchema)

export default User