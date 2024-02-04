import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/User.model.js'
import {Video} from '../models/video.model.js'
import { Subscription } from '../models/subscription.model.js'
import {cloudnaryFileUpload, destroyOldFilesFromCloudinary} from '../utils/cloudnary.js'
import {ApiResponse} from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessTokenAndRefreshToken = async(userId) => {
   try {
      const user = await User.findById(userId)
      const accessToken = user.accessTokenGenerator();
      const refreshToken = user.refreshTokenGenerator();

      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave: false})

      return {accessToken,refreshToken}
   } catch (error) {
      throw new ApiError(500,"Error while generating access and refresh tokens")
   }
}
 
const registerUser = asyncHandler(async (req,res)=>{
   const {username,email,fullname,password} = req.body

   if(
    [username,email,fullname,password].some((field)=>
    field?.trim() === "")
   ){
      throw new ApiError(403, "All fields required")
   }

   const existingUserName = await User.findOne({username})
   const existingUser = await User.findOne({email})

   if(existingUser){
      throw new ApiError(401, "User already exist")  
   } 
   
   if(existingUserName){
      throw new ApiError(401, "Username already taken")
   }

   let avatarLocalPath;
   let coverImageLocalPath; 
 
   if(req.files && Array.isArray(req.files?.avatar)){
      if(req.files?.avatar.length > 0){
         avatarLocalPath = req.files?.avatar[0]?.path
      }
   }

   if(req.files && Array.isArray(req.files?.coverImage)){
      if(req.files?.coverImage.length > 0){
         coverImageLocalPath = req.files?.coverImage[0]?.path 
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

   console.log("User created successfully") 

   return res.status(201).json(
    new ApiResponse(201,createdUser, "User created successfully") 
   )
}) 

const loginUser = asyncHandler(async(req,res)=>{
   const {username,email,password} = req.body;
   if(
      [(username || email), password].some((field)=>
      field?.trim() === "")
     ){
      throw new ApiError(400,"All fields required")
   }
 
   if(!username && !email){ 
      throw new ApiError(402,"Username or email is required")
   }

   const user = await User.findOne({
      $or : [{username},{email}]
   })

   if(!user){
      throw new ApiError(404,"User not found")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
      throw new ApiError(405,"Invalid User Crudentials")
   }

   const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

   const loggedInUser = await User.findOne(user._id).select("-password -refreshToken");

   console.log("User logged in successfully") 

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
      new ApiResponse(
         200,{
            user: loggedInUser,accessToken,refreshToken
         },
         "user logged in successfully")
      )
})

const getUser = asyncHandler(async(req,res)=>{
   const user = req.user

   console.log("User successfully retrieved") 

   res.status(200)
   .json(new ApiResponse(200,{user},"User details successfully retrieved"))
})

const logoutUser = asyncHandler(async(req,res) =>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset: {
            refreshToken: 1,
         },
      },
      {
         new: true
      }
   )

   console.log("User logout successfully") 

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User loggout successfully"))
})

const refreshTokenValidator = asyncHandler(async(req,res)=>{
   const incomingToken = req?.cookies?.refreshToken || req.header('Authorization')?.replace("Bearer ","")

   if(!incomingToken){
      throw new ApiError(401,"Unauthorized access")
   }

   try {
      const decodeToken = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET)
   
      const user = await User.findById(decodeToken._id)
   
      if(!user){
         throw new ApiError(402,"User not found")
      }
   
      if(incomingToken !== user?.refreshToken){
         throw new ApiError(400,"Session Expired")
      }
   
      const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

      console.log("Session refreshed successfully")
   
      const options = {
         httpOnly: true,
         secure: true,
      }
   
      return res
      .status(200)
      .cookie("accessToken",accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200,{
         accessToken,
         refreshToken
      },"Session refreshed successfully"))
   } catch (error) {
      throw new ApiError(403,error)
   }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
   const {oldPassword, newPassword, confirmPassword} = req.body;
   const user = await User.findById(req.user?._id);

   if(
      [oldPassword, newPassword, confirmPassword].some((field)=>
      field?.trim() === "")
     ){
      throw new ApiError(400,"All fields required")
   }

   if(newPassword !==  confirmPassword){
      throw new ApiError(402,"Password and Confirm Password must be same")
   }
 
   const checkPassword = await user.isPasswordCorrect(oldPassword)
 
   if(!checkPassword){
      throw new ApiError(405,"Invalid Password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false}) 

   console.log("Password successfully updated")

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password successfully updated"))
})

const updateUserDetails = asyncHandler(async(req,res)=>{
   const {fullName, username} = req.body

   let avatarLocalPath;
   let coverImageLocalPath; 

   if(req.files && Array.isArray(req.files?.avatar)){
      if(req.files?.avatar.length > 0){
         avatarLocalPath = req.files?.avatar[0]?.path
      }
   }

   if(req.files && Array.isArray(req.files?.coverImage)){
      if(req.files?.coverImage.length > 0){
         coverImageLocalPath = req.files?.coverImage[0]?.path 
      }
   }

   const avatar = await cloudnaryFileUpload(avatarLocalPath)
   const coverImage = await cloudnaryFileUpload(coverImageLocalPath) 

   const currUser = await User.findById(req.user?._id).select("-password -refreshToken")

   if(currUser?.avatar){
      await destroyOldFilesFromCloudinary(currUser.avatar)
   }

   if(currUser?.coverImage){
      await destroyOldFilesFromCloudinary(currUser.coverImage)
   }

   currUser.fullname = fullName;
   currUser.username = username;
   currUser.avatar = avatar?.url;
   currUser.coverImage = coverImage?.url;

   currUser.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(200,currUser,"User details updated successfully"))
})

const deleteUserProfile = asyncHandler(async(req, res)=>{
   const {password} = req.body
   const currUser = await User.findById(req.user?._id)

   const checkPassword = await currUser.isPasswordCorrect(password)
   
   if(!checkPassword){
      throw new ApiError(402,"Invalid Password")
   }

   const avatar = currUser?.avatar
   const coverImage = currUser?.coverImage

   try {
      await currUser.deleteOne();
      if(avatar){
         await destroyOldFilesFromCloudinary(avatar,'image')
      }
   
      if(coverImage){
         await destroyOldFilesFromCloudinary(coverImage,'image')
      }

      console.log("User profile deleted successfully")
      return res
      .status(200)
      .json(new ApiResponse(200,{},"User profile deleted successfully"))
   } catch (error) {
      throw new ApiError(500,error)
   }
})

const getUserProfileDetails = asyncHandler(async(req, res)=>{

   // const channel = await User.aggregate(
   //    [{
   //       $match: {
   //          username: username?.toLowerCase() 
   //       }
   //    },
   //    {
   //       $lookup:{
   //          from: "subscriptions",  
   //          localField: "_id",      
   //          foreignField: "channel",
   //          as: "subscribers"
   //       }
   //    },
   //    {
   //       $lookup:{
   //          from: "subscriptions",
   //          localField: "_id",
   //          foreignField: "subscriber",
   //          as: "subscribedTo"
   //       }
   //    },
   //    {
   //       $addFields:{
   //          subscribersCount: {
   //             $size: "$subscribers" 
   //          },
   //          subscribedToCount: {
   //             $size: "$subscribedTo"
   //          },
   //          isSubscribed: {
   //             $cond:{
   //                if: { $in: [req.user?._id, "$subscribers.subscriber"]},
   //                then: true,
   //                else: false
   //             }
   //          }
   //       }
   //    },
   //    {
   //       $project: {
   //          fullName: 1,
   //          username: 1,
   //          subscribersCount: 1,
   //          subscribedToCount: 1,
   //          avatar: 1,
   //          coverImage: 1,
   //          isSubscribed: 1
   //       }
   //    }]
   // )

   const subscribedTo = await Subscription.find({subscriber: req.user?._id})
   const subscribers = await Subscription.find({channel: req.user?._id})

   console.log("User channel fetched successfully")

   return res 
   .status(200)
   .json(
      new ApiResponse(200,{
         followers: subscribers.length,
         followed: subscribedTo.length,
      },"User channel fetched successfully")
   )
})

const addToWatchHistory = asyncHandler(async(req, res)=>{ 
  const videoId = req.query.videoId

  const user = await User.findById(req.user?._id)

  if(!user){
   throw new ApiError(404," User not found")
  }
  let length = user.watchHistory.length

  if(user.watchHistory[0].toString() !== videoId.toString()){
   if(length >= 100){
      user.watchHistory.pop()
   }
   user.watchHistory.unshift(videoId)
   user.save({validateBeforeSave: false})
 
   console.log(`new video with videoId: ${videoId} added to watchhistory successfully`)
 
   return res 
   .status(200)
   .json(
    new ApiResponse(200,videoId,"new video added to watchhistory successfully")
   )
  }
  else{
   throw new ApiError(401,"video already watched")
  }
})

const getWatchHistory = asyncHandler(async(req, res)=>{ 
    const user = await User.findById(req.user?._id)

    const watchHistory = user.watchHistory
  
    console.log(`Watchhistory retrieved successfully`)
  
    return res 
    .status(200)
    .json(
     new ApiResponse(200,{
      totalWatches: watchHistory.length,
      watchHistory,
   },"Watchhistory retrieved successfully")
   )
})
 
const toggleSubscriber = asyncHandler(async(req, res)=>{
   const videoId = req.query.videoId

   if(!videoId){
      throw new ApiError(404,"Video not found")
   }

   try { 
      const user = await User.findById(req.user?._id)
      const video = await Video.findById(videoId);

      if(!user){
         throw new ApiError(404," User not found")
      }
      if(!video){
         throw new ApiError(404," video not found")
      }

      const isUserSubscribed = await Subscription.exists({
         channel: video.owner,  
         subscriber: req.user?._id, 
      });

      if(!isUserSubscribed) {
         if (video.owner != req.user?._id) {
            const newSubscription = await Subscription.create({
               channel: video.owner,
               subscriber: req.user?._id,
            });
   
            console.log("New subscriber added successfully");
   
            return res
               .status(200)
               .json(
                  new ApiResponse(200, newSubscription, "New subscriber added successfully")
               );
         } else {
            throw new ApiError(401,"Unauthorized access")
         }
      } else {
         const subscriptionId = await Subscription.findOne({
            $and: [{subscriber: req.user?._id},{channel: video.owner}]
         })
         
         await Subscription.deleteOne(subscriptionId._id)
         console.log("User unsubscribed successfully");
         return res
            .status(200)
            .json(new ApiResponse(200, {}, "User unsubscribed successfully"));
      }
   } catch (error) {
      throw new ApiError(500,error)
   }
})

export { registerUser, loginUser, logoutUser, getUser, refreshTokenValidator, changeCurrentPassword,updateUserDetails, deleteUserProfile, getUserProfileDetails, addToWatchHistory, toggleSubscriber, getWatchHistory }   