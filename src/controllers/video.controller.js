import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ErrorResponse } from "../utils/ErrorResponse.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
        deleteLocalFiles([req.files?.video?.[0]?.path, req.files?.thumbnail?.[0].path]);
        throw new ErrorResponse(400, "Title and description required");
    }

    console.log("Video Title:", title);  //!debug
    console.log("Video description:", description);  //!debug

    // req.files?.avatar?.[0]?.path;                            
    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    console.log("Video path:", videoLocalPath);  //!debug
    console.log("thumbnail path:", thumbnailLocalPath);  //!debug

    if (!videoLocalPath || !thumbnailLocalPath) {
        deleteLocalFiles([videoLocalPath, thumbnailLocalPath]);
        throw new ErrorResponse(400, "Video and thumbnail required");
    }

    console.log("Files received:", req.files); //!debug

    try {
        // uploading video
        const videoFile = await uploadOnCloudinary(videoLocalPath);

        if (!videoFile?.url) {
            deleteLocalFiles([videoLocalPath]);
            throw new ErrorResponse(500, "Failed to upload video");
        }

        console.log("video cloud URL:", videoFile?.url); //!debug

        // uploading thumbnail
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail?.url) {
            deleteLocalFiles([thumbnailLocalPath]);
            throw new ErrorResponse(500, "Failed to upload thumbnail");
        }

        console.log("thumbnail cloud URL:", thumbnail?.url); //!debug
        // creating video

        const video = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            owner: req.user._id,
            title: title.trim(),
            description: description.trim(),
            duration: videoFile.duration || 0,
            isPublished: true
        });

        if (!video) {
            await deleteFromCloudinary(thumbnail?.public_id);
            await deleteFromCloudinary(videoFile?.public_id);
            throw new ErrorResponse(500, "something went wrong while uploading");
        }

        return res
            .status(201)
            .json(new ApiResponse(201, video, "video uploaded successfully"));

    } catch (error) {
        console.error("Publish Video Error:", error);

        const videoPath = req.files?.video?.[0]?.path;
        const thumbnailPath = req.files?.thumbnail?.[0]?.path;
        deleteLocalFiles([videoPath, thumbnailPath]);

        throw new ErrorResponse(
            500,
            error.message || "Something went wrong while publishing video"
        );
    }

});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ErrorResponse(400, "Video id is missing");
    }

    try {
        const video = await Video.findById(videoId);

        if (!video) {
            throw new ErrorResponse(404, "Video not found");
        }

        if (!video.isPublished) {
            throw new ErrorResponse(403, "Video is not published");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, video, "Video retrieved successfully"));

    } catch (error) {
        console.error("Get Video Error:", error);

        
        if (error.name === 'CastError') {
            throw new ErrorResponse(400, "Invalid video ID format");
        }

        throw new ErrorResponse(500, error.message || "Failed to retrieve video");
    }

});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}