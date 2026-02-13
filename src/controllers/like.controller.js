import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "provide valid video id")
    }

    const isLiked = await Like.findOne({ video: videoId, likedBy: req.user._id })

    if (!isLiked) {
        try {
            const liked = await Like.create({
                video: videoId,
                likedBy: req.user._id
            })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, liked, "like added")
                )
        } catch (error) {
            throw new ApiError(500, "Error while adding your like")
        }
    }
    else {
        try {
            await Like.findOneAndDelete({ video: videoId, likedBy: req.user._id })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, "unliked", "removed your like")
                )
        } catch (error) {
            throw new ApiError(500, "error while removing like")
        }
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(404, "provide valid comment id")
    }

    const isLiked = await Like.findOne({ comment: commentId, likedBy: req.user._id })

    if (!isLiked) {
        try {
            const liked = await Like.create({
                comment: commentId,
                likedBy: req.user._id
            })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, liked, "liked comment successfully")
                )
        } catch (error) {
            throw new ApiError(500, "error while adding comment like")
        }
    }
    else {
        try {
            await Like.findOneAndDelete({ comment: commentId, likedBy: req.user._id })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, "unliked", "removed your like")
                )
        } catch (error) {
            throw new ApiError(500, "error while removing like")
        }
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(404, "provide valid tweet id")
    }

    const isLiked = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })

    if (!isLiked) {
        try {
            const liked = await Like.create({
                tweet: tweetId,
                likedBy: req.user._id
            })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, liked, "liked tweet successfully")
                )
        } catch (error) {
            throw new ApiError(500, "error while adding like")
        }
    }
    else {
        try {
            await Like.findOneAndDelete({ tweet: tweetId, likedBy: req.user._id })

            return res
                .status(200)
                .json(
                    new ApiResponse(200, "unliked", "removed your like")
                )
        } catch (error) {
            throw new ApiError(500, "error while removing like")
        }
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVidoes = await Like.aggregate([
        {
            $match: { likedBy: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "video",
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "video.owner",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                title: "$video.title",
                thumbnail: "$video.thumbnail",
                videoFile: "$video.videoFile",
                description: "$video.description",
                duration: "$video.duration",
                views: "$video.views",
                owner: {
                    fullName: "$owner.fullName",
                    userName: "$owner.userName",
                    avatar: "$owner.avatar"
                }
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, likedVidoes, "liked videos fetched successfully")
        )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}