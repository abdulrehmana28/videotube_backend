import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post("/", createTweet);

router.get("/user/:userId", getUserTweets);

router.route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet);

// router.patch("/:tweetId", updateTweet);
// router.delete("/:tweetId", deleteTweet);
export default router