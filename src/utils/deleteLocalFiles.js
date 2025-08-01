import fs from "fs";
const deleteLocalFiles = (files) => {
    files.forEach(file => {
        if (file && fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
};

export { deleteLocalFiles }