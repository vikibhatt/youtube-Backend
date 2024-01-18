import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {ApiResponse} from '../utils/apiResponse.js'
import {Video} from '../models/video.model.js'
import {cloudnaryFileUpload, destroyOldFilesFromCloudinary} from '../utils/cloudnary.js'
import { User } from '../models/User.model.js'
import mongoose, { Schema } from 'mongoose'

const uploadVideo = asyncHandler(async(req, res)=>{
    const user = User.findById(req.user?._id)

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const {title, description} = req.body

    if(!title){
        throw new ApiError(401,"Title field is required")
    }

    let videoLocalPath;
    let videoThumbnalLocalPath

    if(req.files && Array.isArray(req.files?.videoFile)){
        if(req.files?.videoFile.length > 0){
           videoLocalPath = req.files?.videoFile[0]?.path
        }
    }
 
    if(req.files && Array.isArray(req.files?.thumbnail)){
        if(req.files?.thumbnail.length > 0){
           videoThumbnalLocalPath = req.files?.thumbnail[0]?.path
        }
    }

    const videoPath = await cloudnaryFileUpload(videoLocalPath)
    const thumbnailPath = await cloudnaryFileUpload(videoThumbnalLocalPath)

    if(!videoPath || !thumbnailPath){
        await destroyOldFilesFromCloudinary(thumbnailPath.url)
        .then(()=>{
            throw new ApiError(404,"Video or thumbnail path not found")
        })
    }

    try {
        const uploadVideoFile = await Video.create({
            title,
            description,
            video: videoPath?.url,
            thumbnail: thumbnailPath?.url,
            duration: videoPath?.duration,
            isPublished: true
        })
        console.log("Video uploaded successfully")

        return res
        .status(200)
        .json(
            new ApiResponse(200,uploadVideoFile,"Video uploaded successfully")
        )
    } catch (error) {
        throw new ApiError(500,error)
    }
})


const deleteVideo = asyncHandler(async(req, res)=>{
    const user = User.findById(req.user?._id)

    if(!user){
        throw new ApiError(404, "User not found")
    }
})

export {uploadVideo}