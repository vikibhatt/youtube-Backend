import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {ApiResponse} from '../utils/apiResponse.js'
import {Video} from '../models/video.model.js'
import {Playlist} from '../models/playlist.model.js'
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
            isPublished: true,
            owner: req.user._id
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

const viewVideo = asyncHandler(async(req, res)=>{
  const user = await User.findById(req.user?._id)
  const {videoId} = req.query

  if(!user){
     throw new ApiError(404," User not found ")
  }

  try {
     const video = await Video.findById(videoId)

     video.views = video.views+1
     video.save({validateBeforeSave: false})

     if(!video){
        throw new ApiError(404, "Video not found")
     }

     return res
     .status(200)
     .json(
        new ApiResponse(200,video.views,"views increased successfully")
     )
  } catch (error) {
     throw new ApiError(500, error)
  }
})

const createPlaylist = asyncHandler(async(req, res)=>{
    const {name, description, videoId} = req.body

    if(!name || !description){
        throw new ApiError(401, "name or description is required")
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(404, "User not found")
    }

        try {
          const checkPlayList = await Playlist.exists({ 
            $and: [{name: name},{owner: req.user?._id}]
          })

          if(checkPlayList){
            throw new ApiError(401, "Playlist already exist")
          }

          const newPlayList = await Playlist.create({
            name,
            description,
            videoId: videoId,
            owner: req.user?._id
          })

        return res
        .status(200)
        .json(new ApiResponse(200, newPlayList,"Playlist created successfully" ))
        } catch (error) {
            throw new ApiError(500, error)
        }
})

const addVideoToPlaylist = asyncHandler(async(req, res)=>{
  const {name, videoId} = req.body

  if(!videoId){
      throw new ApiError(401, "Video is required")
  }

  const user = await User.findById(req.user?._id)

  if(!user){
      throw new ApiError(404, "User not found")
  }

      try {
        const checkPlayList = await Playlist.exists({
          $and: [{name: name},{owner: req.user?._id}]
        })

        if(!checkPlayList){
          throw new ApiError(401, "Playlist doesn't exist")
        }

        const newPlayList = await Playlist.findOne({
          $and: [{name: name},{owner: req.user?._id}]
        })

        if(newPlayList.videos.includes(videoId)){
          throw new ApiError(401,"Video already exists inside the playlist")
        }

        newPlayList.videos.unshift(videoId)
        newPlayList.save();

      return res
      .status(200)
      .json(new ApiResponse(200, newPlayList,`new video with videoId: ${videoId} added to playlist successfully` ))
      } catch (error) {
          throw new ApiError(500, error)
      }
})

const getAllVideos = asyncHandler(async(req, res)=>{
  const getVideos = await Video.find({owner: req.user._id})

  return res 
  .status(200)
  .json(
    new ApiResponse(200,getVideos,"All videos retrieved successfully")
  )
})

const getVideo = asyncHandler(async(req, res)=>{
  const videoId = req.query.videoId

  const video = await Video.findById(videoId)

  if(!video){
    throw new ApiError(404, "videos not found")
  }

  console.log("Video retrieved successfully")

  return res 
  .status(200)
  .json(
    new ApiResponse(200, video.owner, "Video retrieved successfully")
  )
})

const deleteVideo = asyncHandler(async(req, res)=>{
    const user = await User.findById(req.user?._id)
    const videoId = req.query.videoId

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const video = await Video.findById(videoId)

    if(!video){
      throw new ApiError(404,"video not found")
    }

    const videoFile = video?.video
    const thumbnailFile = video?.thumbnail

    try {
      await video.deleteOne()

      if(videoFile){
        await destroyOldFilesFromCloudinary(videoFile,'video')
      }
      if(thumbnailFile){
        await destroyOldFilesFromCloudinary(thumbnailFile,'image')
      }

      console.log("Video deleted successfully")

      return res
      .status(200)
      .json(
        new ApiResponse(200,{},"Video deleted successfully")
      )
    } catch (error) {
      throw new ApiError(500, error)
    }
    
})

export {uploadVideo, createPlaylist, deleteVideo, getAllVideos, viewVideo, addVideoToPlaylist}