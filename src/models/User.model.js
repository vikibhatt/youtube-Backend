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
    },
    coverImage:{
        type:String,   
    },
    watchHistory:[{
        type: String,
    }],
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    refreshToken:{
        type:String
    }
},{timestamps:true})

UserSchema.pre('save', async function (next){
    if(!this.isModified("password")) return next()

   try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password,salt)
    next()
   } catch (error) {
    next(error)
   }
})

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

UserSchema.methods.accessTokenGenerator = function(){
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

UserSchema.methods.refreshTokenGenerator = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model('User',UserSchema) 