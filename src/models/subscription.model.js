import mongoose,{Schema} from 'mongoose'

const subscriptionSchema = new Schema({
    subscriber:{
        type: String, 
        required: true
    },
    channel:{
        type: String,
        required: true  
    }
},{timestamps:true})


export const Subscription = mongoose.model("Subscription",subscriptionSchema)