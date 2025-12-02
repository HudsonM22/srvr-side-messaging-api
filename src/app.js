import express from 'express'
import cors from 'cors'
import userRouter from './routers/user.js'
import './db/mongoose.js'
import friendRouter from './models/FriendRequest.js'
const app = express() 

app.use(express.json()) 
app.use(cors()) 
app.use(function (req, res, next) { 
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); 
    next(); 
}); 
app.use(userRouter)
app.use(friendRouter)

const port = process.env.PORT 
app.listen(port, () => { 
    console.log('Listening on port ' + port) 
})