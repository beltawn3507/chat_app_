import mongoose from "mongoose";

const connectDB=async()=>{
    const url=process.env.MONGO_URI;

    if(!url){
        throw new Error("MONGO_URI is not defined in environment variables");
    }

    try {
        await mongoose.connect(url,{
            dbName:"ChatAppMicroservice"
        });
        console.log("connected to mongoDb");
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

export default connectDB