import mongoose from "mongoose"
import {DB_NAME} from '../constants.js'
import dotenv from'dotenv'

dotenv.config();

const connectDB = async ()=>{
    try{
        const connection = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        console.log(`Connected to the mongoDB host ${connection.connection.host}`)
    }
    catch(err){
        console.log("DB connection error: ",err)
        process.exit(1);
    }
}

export default connectDB