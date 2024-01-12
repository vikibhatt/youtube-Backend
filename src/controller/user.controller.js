import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/User.model.js'
import cloudnaryFileUpload from '../utils/cloudnary.js'
import {ApiResponse} from '../utils/apiResponse.js'

const registerUser = asyncHandler(async (req,res)=>{
   // get user details
   // validatation - not empty
   // check if user is already exists
   // check for images, check for avatar
   // upload them to cloudnary, avatar
   // create user object- create entry in display: 'block',
   // remove passowrd and refresh token fields from response
   // check for user creation
   // return response


   const {username,email,fullname,password} = req.body

   if(
    [username,email,fullname,password].some((field)=>
    field?.trim() === "")
   ){
    throw new ApiError(400,"All fields required")
   }

   console.log(username,email,fullname,password)

   const existingUserName = await User.findOne({username})
   const existingUser = await User.findOne({email})

   if(existingUser){
      throw new ApiError(401,"User already exists")
   }
   
   if(existingUserName){
      throw new ApiError(401,"UserName already taken")
   }

   let avatarLocalPath;
   let coverImageLocalPath;

   if(req.field && Array.isArray(req.field.avatar,req.field.coverImage)){
      if(req.field.avatar.length > 0){
         avatarLocalPath = req.field.avatar[0].path
      }
      if(req.field.coverImage.length > 0){
         avatarLocalPath = req.field.coverImage[0].path
      }
   }

   const avatar = await cloudnaryFileUpload(avatarLocalPath)
   const coverImage = await cloudnaryFileUpload(coverImageLocalPath)

   const user = await User.create({
    fullname,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password
   })

   const createdUser = await User.findOne(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
    throw new ApiError(500,"error while registering new user")
   }

   return res.status(201).json(
    new ApiResponse(201,createdUser,"User created successfully")
   )
}) 

export {registerUser} 