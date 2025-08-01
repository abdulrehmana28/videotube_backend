import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import "dotenv/config"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // file has been uploaded successfully
        console.log("File is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log("Error on fileupload", error);

        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId);
        console.log("File deleted from cloudinary", response);

        return response;

    } catch (error) {
        console.log("Error on file delete from cloudinary", error);

        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }