import { ErrorResponse } from "../utils/ErrorResponse.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

const verifyJWT = async (req, _, next) => {

    const token = req.cookies?.accessToken || req.body?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return next(new ErrorResponse(401, "Unauthorized request"));
    }

    try {

        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            return next(new ErrorResponse(401, "Invalid Access Token"));
        }

        // store user info for other middleware
        req.user = user;
        next();

    } catch (error) {

        throw new ErrorResponse(401, error?.message || "Invalid access token");
    }

}

export { verifyJWT }