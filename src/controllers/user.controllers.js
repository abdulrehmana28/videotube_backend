import { ErrorResponse } from "../utils/ErrorResponse.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";

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

export { registerUser }