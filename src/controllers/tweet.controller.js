import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ErrorResponse } from "../utils/ErrorResponse.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    console.log("user ID: ", userId); //! debug


    if ((!content || content.trim().length === 0)) {
        throw new ErrorResponse(400, "Tweet content cannot be empty");
    }

    if (content.length > 280) {
        throw new ErrorResponse(400, "Tweet cannot exceed 280 characters");
    }

    try {

        const tweet = await Tweet.create({
            content: content.trim(),
            owner: userId
        });
        //! debug
        console.log("this is Tweet:", tweet.content, "Tweet owner:", tweet.owner);

        if (!tweet) {
            throw new ErrorResponse(500, "Failed to create tweet");
        }

        return res
            .status(201)
            .json(new ApiResponse(201, tweet, "Tweet posted successfully"));

    } catch (error) {
        console.error("Create Tweet Error:", error);
        throw new ErrorResponse(
            500,
            error.message || "Something went wrong while creating tweet"
        );
    }
});

const getUserTweets = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;

        const userAllTweets = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(userId?.toString())
                },
            },
            {
                $lookup: {
                    from: "tweets",
                    localField: "_id",
                    foreignField: "owner",
                    as: "userTweets"
                },
            },
            {
                $addFields: {
                    userTweetCount: {
                        $size: "$userTweets"
                    }
                }
            },
            {
                $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                    userTweets: 1,
                    userTweetCount: 1,
                }
            }

        ]);

        console.log("User Tweets: ", userAllTweets);

        if (!userAllTweets?.length) {
            return res.status(200).json(new ApiResponse(
                200,
                [],
                "User has no tweets"
            ));
        }

        return res
            .status(200)
            .json(new ApiResponse(200, userAllTweets, "User tweets fetched successfully"));

    } catch (error) {
        console.error("failed to fetch user tweets Error:", error);
        throw new ErrorResponse(500, "Something went wrong while fetching user tweets");
    }

});

const updateTweet = asyncHandler(async (req, res) => {
    try {

        const { tweetId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || content?.trim().length === 0) {
            throw new ErrorResponse(400, "Tweet content cannot be empty");
        }

        if (content.trim().length > 280) {
            throw new ErrorResponse(400, "Tweet cannot exceed 280 characters");
        }

        const updateTweet = await Tweet.findOneAndUpdate(
            {
                _id: tweetId,
                owner: userId
            },
            {
                $set: {
                    content: content.trim()
                }
            },
            {
                new: true,
            });

        if (!updateTweet) {
            throw new ErrorResponse(404, "Tweet not found or you don't have permission to update it");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, updateTweet, "Tweet updated successfully"));

    } catch (error) {
        console.error("Update Tweet Error:", error);
        if (error.name === 'CastError') {
            throw new ErrorResponse(400, "Invalid tweet ID format");
        }
        throw new ErrorResponse(500, "Something went wrong while updating tweet");
    }
});


const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    try {

        const { tweetId } = req.params;
        const userId = req.user._id;

        if (!tweetId) {
            throw new ErrorResponse(400, "Tweet ID is missing");
        }

        const deletedTweet = await Tweet.findOneAndDelete(
            {
                _id: tweetId,
                owner: userId
            }
        );

        if (!deletedTweet) {
            throw new ErrorResponse(404, "Tweet not found or you don't have permission to delete it");
        }

        if (!deletedTweet) {
            throw new ErrorResponse(404, "Tweet not found or you don't have permission to delete it");
        }

        // Success response
        return res.status(200).json(new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        ));

    } catch (error) {
        console.error("Delete Tweet Error:", error);
        if (error.name === 'CastError') {
            throw new ErrorResponse(400, "Invalid tweet ID format");
        }
        throw new ErrorResponse(500, "Something went wrong while deleting tweet");
    }
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}