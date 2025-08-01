import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images")
    },
    filename: function (req, file, cb) {

        cb(null, `${Date.now()}-${file.originalname}`);
    }
})

export const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1000 * 1000,
    },
});