import { registerUser, loginUser, logoutUser } from "../controllers/user.controllers.js";
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

router.post("/logout", verifyJWT, logoutUser);

export default router;
