import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import jwt from 'jsonwebtoken'
import {User} from '../models/User.model.js'

export const veryfyJWT = asyncHandler(async( req, _, next)=>{
    try {
        const token = req?.cookies?.accessToken || 
        req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401,"Unauthorization Access")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(404,"User not found")
        }
    
         req.user = user
         next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access")
    }
})
