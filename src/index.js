import { app } from "./app.js";
import "dotenv/config";
import connectDB from "./db/dbConnection.js";



const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed", err);
    });
