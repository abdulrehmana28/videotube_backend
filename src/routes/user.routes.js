import {
    registerUser,
    loginUser,
    logoutUser,
    updateAccountDetails,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    refreshAccessToken,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router();

router.post("/register", upload.fields(
    [
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]

), registerUser);

router.post("/login", loginUser);

router.post('/refresh-token', refreshAccessToken);

// Protected Routes

router.post("/logout", verifyJWT, logoutUser);

router.patch("/update-account", verifyJWT, updateAccountDetails);

router.post("/change-password", verifyJWT, changeCurrentPassword);

router.get("/profile", verifyJWT, getCurrentUser);

router.patch("/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);

router.patch("/cover-image", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.get("/@:username", verifyJWT, getUserChannelProfile);

router.get("/history", verifyJWT, getWatchHistory);

export default router;
