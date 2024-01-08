import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import {limitSize} from './constants.js'
 

const app = express();
dotenv.config({
    path:'./env'
});

app.use(cors({
    origin: process.env.CROSS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:limitSize})) 
app.use(express.urlencoded({extended: true,limit: limitSize}))
app.use(express.static('public'))

app.use(cookieParser())


export default app