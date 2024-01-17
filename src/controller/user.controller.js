import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/User.model.js'
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
   // get data from client
   // validate user based on username or email
   // find the user
   // validate password
   // generate access token and refresh token and save refresh token on user
   // send cookies 
   // send response

   const {username,email,password} = req.body;
   if(
      [username, email, password].some((field)=>
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

   res.status(200)
   .json(new ApiResponse(200,{user},"User details successfully retrieved"))
})

const logoutUser = asyncHandler(async(req,res) =>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined,
         },
      },
      {
         new: true
      }
   )

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

export {registerUser,loginUser,logoutUser,getUser,refreshTokenValidator,changeCurrentPassword,updateUserDetails}  