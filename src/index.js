import dotenv from 'dotenv'
import {connectDB} from './db/db.js'
import {app} from './app.js'

dotenv.config({
    path:'./.env'
});

const port = process.env.PORT || 3000

connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server connected to port ${port}`)
    })
})
.catch((err)=>{ 
    console.log("Server connection failed ",err)
})


