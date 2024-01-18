import dotenv from 'dotenv'
import connectDB from './db/db.js'
import {app} from './app.js'

const port = process.env.PORT || 3000

dotenv.config({
    path:'./.env'
});

connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server connected to port ${port}`)
    })
})
.catch((err)=>{
    console.log("Server connection failed ",err)
})


