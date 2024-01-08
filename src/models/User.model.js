import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const UserSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim: true,
        index: true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim: true,
    },
    fullname:{
        type:String,
        required:true,
        trim: true,
        index: true
    },
    avatar:{
        type:String,   
        required:true,
    },
    coverImage:{
        type:String,   
    },
    videoHistory:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Video'
    }],
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    refreshTokens:{
        type:String
    }
},{timestamps:true})

UserSchema.pre('save', async function (){
    if(!this.isModified("password")) return next()

    this.password = bcrypt.hash(this.password,10)
    next()
})

UserSchema.methods = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

UserSchema.methods = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model('User',UserSchema)