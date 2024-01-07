import express from 'express'
import dotenv from 'dotenv'
import connectDB from './db/db.js'

dotenv.config({
    path:'./env'
});
connectDB()

const port = process.env.PORT || ''

const app = express();

app.get('/',(req,res)=>{
    res.send("hello world")
})
app.listen(port,()=>{
    console.log(`backend connected to port ${port}`)
})
 
