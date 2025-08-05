import { ErrorResponse } from "../utils/ErrorResponse.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary, getPublicIdFromUrl } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ErrorResponse(404, "User not found");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ErrorResponse(500, "Something went wrong while generating access and refresh tokens");
    }
};

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if (!fullname || !email || !username || !password) {
        deleteLocalFiles([req.files?.avatar?.[0]?.path, req.files?.coverImage?.[0]?.path]);
        throw new ErrorResponse(400, "All fields are required");
    }


    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;


    // check if user already exists
    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (userExists) {
        deleteLocalFiles([avatarLocalPath, coverImageLocalPath]);
        throw new ErrorResponse(409, "User already exists");
    }


    console.log("Files received:", req.files);



    if (!avatarLocalPath) {
        throw new ErrorResponse(400, "Avatar is required");
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    // let coverImage = "";
    // if (coverImageLocalPath) {
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
    } catch (error) {
        console.log("Error uploading avatar: ", error);
        deleteLocalFiles([avatarLocalPath]);
        throw new ErrorResponse(500, "Error uploading avatar");
    }

    let coverImage;
    try {
        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath);
        }

        console.log("Avatar path:", avatarLocalPath);
        console.log("Cover image path:", coverImageLocalPath);
    } catch (error) {
        console.log("Error uploading coverImage: ", error);
        deleteLocalFiles([coverImageLocalPath]);
        throw new ErrorResponse(500, "Error uploading coverImage");
    }

    // creating user
    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) {
            throw new ErrorResponse(500, "Something went wrong while registering the user");
        }

        return res.status(201).json(new ApiResponse(201, createdUser, "User registered Successfully"));

    } catch (error) {

        if (avatar) {
            await deleteFromCloudinary(avatar?.public_id);
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage?.public_id);
        }


        console.log("Error registering user: ", error);

        throw new ErrorResponse(500, "Something went wrong while registering the user");
    }
});

// @desc    Login user
// @route   POST /api/users/login
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ErrorResponse(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ErrorResponse(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ErrorResponse(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if (!loggedInUser) {
        throw new ErrorResponse(500, "Something went wrong while logging in the user");
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

// @desc    Logout user
// @route   POST /api/users/logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
});

// @desc    Refresh access token
// @route   POST /api/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ErrorResponse(401, "unauthorized request or invalid refresh token");
    }

    try {

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(decodedToken?._id).select("+refreshToken");

        if (!user) {
            throw new ErrorResponse(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ErrorResponse(401, "Refresh token is expired or used");
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            );
    } catch (error) {

        throw new ErrorResponse(401, error?.message || "Some thing went wrong while generating accessToken");
    }
});

// @desc    Change current password
// @route   POST /api/users/change-password
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id).select("+password");

    if (!user) {
        throw new ErrorResponse(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ErrorResponse(401, "Invalid old password");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// @desc    Get current user
// @route   GET /api/users/profile
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ));
});

// @desc    Update account details
// @route   PATCH /api/users/update-account
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    // Validation
    if (!fullname && !email) {
        throw new ErrorResponse(400, "Fullname or email is required");
    }

    if (email) {
        const existingUser = await User.findOne({
            email,
            _id: { $ne: req.user?._id }
        });

        if (existingUser) {
            throw new ErrorResponse(409, "Email already exists");
        }

    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                ...(fullname && { fullname }),
                ...(email && { email })
            }
        },
        {
            new: true,
            select: "-password -refreshToken"
        }
    );

    if (!updatedUser) {
        throw new ErrorResponse(404, "User not found");
    }

    res.status(200).json(new ApiResponse(
        200,
        updatedUser,
        "Account details updated successfully"
    ));
});

// @desc    Update user avatar
// @route   PATCH /api/users/avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    try {

        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new ErrorResponse(400, "Avatar is required");
        }

        const currentUser = await User.findById(req.user?._id).select("avatar");
        const oldAvatarUrl = currentUser?.avatar;

        const avatar = await uploadOnCloudinary(avatarLocalPath);

        if (!avatar.url) {
            deleteLocalFiles([avatarLocalPath]);
            throw new ErrorResponse(500, error.message || "Failed to upload avatar");
        }

        if (oldAvatarUrl) {
            const publicId = getPublicIdFromUrl(oldAvatarUrl);
            if (publicId) {
                await deleteFromCloudinary(publicId);
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            { new: true }
        ).select("-password -refreshToken");

        res
            .status(200)
            .json(new ApiResponse(200, user, "Avatar updated successfully"));

    } catch (error) {
        const avatarLocalPath = req.file?.path;
        deleteLocalFiles([avatarLocalPath]);
        throw new ErrorResponse(500, error.message || "Failed to upload avatar");
    }
});

// @desc    Update user cover image
// @route   PATCH /api/users/cover-image
const updateUserCoverImage = asyncHandler(async (req, res) => {

    try {
        const coverImageLocalPath = req.file?.path;

        if (!coverImageLocalPath) {
            throw new ErrorResponse(400, "Cover Image is required");
        }

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!coverImage.url) {
            deleteLocalFiles([coverImageLocalPath]);
            throw new ErrorResponse(500, error.message || "Failed to upload Cover Image");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            { new: true }
        ).select("-password -refreshToken");

        res
            .status(200)
            .json(new ApiResponse(200, user, "Cover Image updated successfully"));

    } catch (error) {
        const coverImageLocalPath = req.file?.path;
        deleteLocalFiles([coverImageLocalPath]);
        throw new ErrorResponse(500, error.message || "Failed to upload Cover Image");
    }
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}