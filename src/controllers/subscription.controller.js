import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "provide valid channel id")
    }

    const channel = await User.findById(channelId)

    if(!channel){
        throw new ApiError(404, "channel not found")
    }

    const isExist = await Subscription.findOne({subscriber: req.user._id, channel: channelId})

    if(!isExist){
        try {
            await Subscription.create({
                subscriber: req.user._id,
                channel: channelId
            })

            return res
            .status(200)
            .json(
                new ApiResponse(200, "subscribed", "subscribed successfully")
            )
        } catch (error) {
            throw new ApiError(500, "error while subscribing")
        }
    }
    else{
        try {
            await Subscription.findByIdAndDelete(isExist._id)

            return res
            .status(200)
            .json(
                new ApiResponse(200, "unsubscribed", "unsubscribed successfully")
            )
        } catch (error) {
            throw new ApiError(500, "error while unsubscribing")
        }
    }
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "provide valid channel id")
    }

    const channelExist = await User.findById(channelId)

    if(!channelExist){
        throw new ApiError(404,"provided id does not exist")
    }
    
    const subscribers = await Subscription.aggregate([
        {
            $match: {channel: channelId}
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "channel",
                as: "subscriber"
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                subscriber: {
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
    ])

    if(!subscribers.length){
        throw new ApiError(404,"This channel have no subscribers yet")
    }

    const info = {
        subscribers: subscribers || [],
        totalSubscribers:subscribers.length || 0
    }

    return res
    .status(200)
    .json(new ApiResponse(200, info,"subscribers fetched successfully"))
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "provide valid subscriber id")
    }
    
    const channels = await Subscription.aggregate([
        {
            $match: {subscriber: new mongoose.Types.ObjectId(channelId)}
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "channel",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                channel: {
                    _id: "$channel._id",
                    fullName: "$channel.fullName",
                    username: "$channel.username",
                    avatar: "$channel.avatar"
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, channels,"subscribed channel fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}