import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {limitSize} from './constants.js'
 

const app = express();

app.use(cors({
    origin: process.env.CROSS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:limitSize})) 
app.use(express.urlencoded({extended: true,limit: limitSize}))
app.use(express.static('public'))

app.use(cookieParser())


import userRouter from './routes/user.routes.js'

app.use('/api/v1/users',userRouter)

export {app}