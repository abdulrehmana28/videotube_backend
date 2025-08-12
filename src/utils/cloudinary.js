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

const deleteFromCloudinary = async (publicId, resourceType) => {
    try {
        if (!publicId) return null;

        // const response = await cloudinary.uploader.destroy(publicId);
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType // 'image', 'video', or 'auto'
        });
        console.log("File deleted from cloudinary", response);

        return response;

    } catch (error) {
        console.log("Error on file delete from cloudinary", error);

        return null;
    }
}

// Helper function to extract public ID from URL
const getPublicIdFromUrl = (url) => {
    if (!url) return null;

    try {
        // Handle different Cloudinary URL formats

        // http://res.cloudinary.com/dfkegimdg/image/upload/v1754205883/by3n0tsid0t1vbx4gyld.png

        const urlParts = url.split('/');
        // Parts URL:  [
        //     'http:',
        //     '',
        //     'res.cloudinary.com',
        //     'dfkegimdg',
        //     'image',
        //     'upload',
        //     'v1754207148',
        //     'obtkpowb3jwluliizeko.png'
        //   ]

        const fileName = urlParts[urlParts.length - 1];
        // File name:  obtkpowb3jwluliizeko.png

        const publicId = fileName.split('.')[0];
        // Public ID:  obtkpowb3jwluliizeko


        return publicId;
    } catch (error) {
        console.log("Error extracting public ID:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl };
