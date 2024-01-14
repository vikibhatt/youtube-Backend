import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/User.model.js'
import cloudnaryFileUpload from '../utils/cloudnary.js'
import {ApiResponse} from '../utils/apiResponse.js'

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

export {registerUser,loginUser,logoutUser,getUser} 