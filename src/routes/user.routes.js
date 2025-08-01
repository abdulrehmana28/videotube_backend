import { registerUser } from "../controllers/user.controllers.js";

import { upload } from "../middlewares/multer.middlewares.js";
import { Router } from "express";

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

export default router;
