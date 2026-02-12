import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId){
        throw new ApiError(404, "video id is required")        
    }

    const comments = await Comment.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(videoId)}
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "comment",
                localField: "_id",
                as: "likedocuments"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likedocuments"
                }
            }
        },
        {
            $project: {
                content: 1,
                likes: 1,
                fullname: 1,
                username: 1,
                avatar: 1
            }
        },
        {
            $skip: (page -1) * limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    if(!comments){
        throw new ApiError(500, "error while fetching comments")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
   
    const { content } = req.body;
    const { videoId } = req.params;

    if(!content?.trim()){
        throw new ApiError(404, "comment id is required")
    }
    
    if(!videoId?.trim()){
        throw new ApiError(404, "video id is required")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if(!comment){
        throw new ApiError(500, "Something went wrong while adding comment in database")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {

    const { content } = req.body
    const { commentId } = req.params

    if(!content?.trim()){
        throw new ApiError(404, "content is required")
    }
    
    if(!commentId?.trim()){
        throw new ApiError(404, "commentId is required")
    }

    const comment = await Comment.findById(commentId)

    if(!comment.owner.equals(req.user._id)){
        throw new ApiError(401, "Unauthorized request")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {content}
        },
        {new: true}
    )

    if(!updateComment){
        throw new ApiError(500, "Something went wrong while updating comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!commentId){
        throw new ApiError(404, "comment id is required")
    }

    const comment = await Comment.findById(commentId)

    if(!comment.owner.equals(req.user._id)){
        throw new ApiError(401, "Unauthorized request")
    }

    const isDeleted = await Comment.findByIdAndDelete(commentId)

    if(!isDeleted){
        throw new ApiError(500, "Error while deleting comment")
    }

    await Like.deleteMany({comment: commentId})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment deleted successfully"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }