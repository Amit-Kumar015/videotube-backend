import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Comment } from "../models/comment.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const video = await Video.aggregate([
        {
            $match: {
                $or: [
                    {title:{$regex:query, $options:"i"}},
                    {describtion:{$regex:query, $options:"i"}}
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "videoBy"
            }
        },
        {
            $unwind: "$videoBy"
        },
        {
            $project: {
                title: 1,
                describtion: 1,
                thumbnail: 1,
                videoFile: 1,
                videoBy: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },
        {
            $sort: {
                [sortBy]:sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (page-1) * limit
        },
        {
            $limit: parseInt(limit)
        }        
    ])

    if(!video){
        throw new ApiError(500, "error while fetching videos")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, isPublished } = req.body

    if(isPublished === null){
      throw new ApiError(404, "Publish status is needed")
    }

    const publishStatus = req.body?.isPublished === "true" ? true : false

    if([title, description].some(item => item.trim() === "")){
        throw new ApiError(404, "provide both title and description")
    }
    

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoLocalPath){
        throw new ApiError(404, "video file is required")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(404, "thumbnail is required")
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    
    if(!video || !thumbnail){
        throw new ApiError(500, "error while uploading on cloudinary")
    }

    const upload = await  Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        title,
        describtion: description,
        duration: video.duration,
        isPublished: publishStatus
    })

    if(!upload){
        throw new ApiError(500, "error while making document")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, upload, "video uploaded successfully")
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "provide valid video id")
    }

    const video = await Video.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(videoId)}
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "uploadedBy"
            }
        },
        {
            $unwind: "$uploadedBy"
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "video",
                localField: "_id",
                as: "likes"
            }
        },
        {
            $addFields: {
                TotalLikes: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                foreignField: "channel",
                localField: "owner",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: {
                    $size: "$subscribers"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                title: 1,
                describtion: 1,
                duration: 1,
                views: 1,
                thumbnail: 1,
                videoFile: 1,
                uploadedBy: {
                    username: 1,
                    avatar: 1,
                    fullName: 1
                },
                TotalLikes: 1,
                isLiked: 1,
                totalSubscribers: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!video){
        throw new ApiError(500, "error while fetching video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params    
    
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "provide valid video id")
    }
    
    const {newTitle, newDescription} = req.body
    const thumbnailLocalPath = req.file?.path

    if(!newTitle?.trim() && !newDescription?.trim() && !thumbnailLocalPath){
      throw new ApiError(400, "Please provide at least one field to update.")
    }

    let thumbnail;

    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }
    
    if(!thumbnail){
      throw new ApiError(500, "error while uploading thumbnail on cloudinary")
    }    

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "video not found")
    }

    if(!video.owner.equals(req.user._id)){
        throw new ApiError(401, "Unauthorized request")
    }

    const updateFields = {};

    if (newTitle) updateFields.title = newTitle;
    if (newDescription) updateFields.description = newDescription;
    if (thumbnail) updateFields.thumbnail = thumbnail;

    const updated = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: { updateFields }
        },
        {
            new: true
        }
    )

    if(!updated){
        throw new ApiError(500, "error while updating video details")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updated, "video details updated successfully")
    )    

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "provide valid video id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "video not found")
    }

    if(!video.owner.equals(req.user._id)){
        throw new ApiError(401, "Unauthorized request")
    }

    const deletedVideo = await video.deleteOne()

    if(!deletedVideo){
        throw new ApiError(500, "error while deleting video")
    }

    await Like.deleteMany({video: videoId})

    await Comment.deleteMany({video: videoId})

    await User.updateMany({watchHistory: videoId}, {$pull: {watchHistory: videoId}})

    return res
    .status(200)
    .json(
        new ApiResponse(200, deletedVideo, "video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "provide valid video Id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(401, "Unauthorized request")
    }

    const toggleStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    if (!toggleStatus) {
        throw new ApiError(500, "error while toggling status")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, toggleStatus, "status toggled successfully")
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}