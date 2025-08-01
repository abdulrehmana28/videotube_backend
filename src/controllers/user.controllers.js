

import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    // add basic validation
    if (!fullname || !email || !username || !password) {
        return res.status(400).json(new ApiResponse(400, "All fields are required"));
    }
    // check if user already exists
    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (userExists) {
        return res.status(409).json(new ApiResponse(409, "user already exist"));
    }

    // TODO
    console.log("Files received:", req.files);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        return res.status(400).json(new ApiResponse(400, "Avatar is required"));
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
        return res.status(500).json(new ApiResponse(500, "Error uploading avatar"));
    }

    let coverImage;
    try {
        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath);
        }
        // TODO
        console.log("Avatar path:", avatarLocalPath);
        console.log("Cover image path:", coverImageLocalPath);
    } catch (error) {
        console.log("Error uploading coverImage: ", error);
        return res.status(500).json(new ApiResponse(500, "Error uploading coverImage"));
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
            return res.status(500).json(new ApiResponse(500, "Something went wrong while registering the user"));
        }

        return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"));

    } catch (error) {

        if (avatar) {
            await deleteFromCloudinary(avatar?.public_id);
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage?.public_id);
        }


        console.log("Error registering user: ", error);

        return res.status(500).json(new ApiResponse(500, "Something went wrong while registering the user"));
    }
});

export { registerUser }