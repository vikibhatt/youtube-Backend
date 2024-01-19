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

const createPlaylist = asyncHandler(async(req, res)=>{
    const {name, description} = req.body

    if(!name){
        throw new ApiError(401, "name is required")
    }

    const user = await User.findById(req.user?._id)
    const newPlayList = await Playlist.create()

    if(!user){
        throw new ApiError(404, "User not found")
    }

        try {
            const playlist = await Playlist.aggregate([
              {
                $match: {
                  _id: new mongoose.Types.ObjectId(newPlayList._id), 
                },
              },
              {
                $addFields: {
                  name,
                  description,
                  owner: user._id,
                },
              },
              {
                $project: {
                  _id: 1,
                },
              },
            ]);

            const mergePlaylist = await Playlist.aggregate([
              {
                $match: {
                    _id: playlist[0]._id
                }
              },
              {
                $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "ownerPlaylist",
                  pipeline: [
                    {
                        $lookup: {
                          from: "playlist",
                          localField: "_id",
                          foreignField: "owner",
                          as: "ownerIdPlayList",
                          pipeline: [
                            {
                                $lookup: {
                                  from: "videos",
                                  localField: "video",
                                  foreignField: "_id",
                                  as: "videoPlayList",
                                  pipeline: [
                                    {
                                        $lookup: {
                                          from: "playlist",
                                          localField: "_id",
                                          foreignField: "video",
                                          as: "videoIdPlayList",
                                        },
                                    }
                                  ]
                                },
                            }
                          ]
                        },
                    }
                  ]
                },
              },
              {
                $addFields: {
                  playlistUniqueId: "$_id",
                },
              },
              {
                $project: {
                    _id: 0
                }
              }
            ])
            
        console.log(mergePlaylist[0].ownerPlaylist)

        return res
        .status(200)
        .json(new ApiResponse(200, mergePlaylist[0].ownerPlaylist,"Playlist created successfully" ))
        } catch (error) {
            throw new ApiError(500, error)
        }
})


const deleteVideo = asyncHandler(async(req, res)=>{
    const user = User.findById(req.user?._id)

    if(!user){
        throw new ApiError(404, "User not found")
    }
})

export {uploadVideo, createPlaylist, deleteVideo}