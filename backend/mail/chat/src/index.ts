import express from "express"
import dotenv from 'dotenv'
import cors from "cors"
import chatRoutes from "./routes/chat.js";
import connectDB from "./config/db.js";


dotenv.config();
const PORT=process.env.PORT;

connectDB();

const app=express();

app.use(express.json());
app.use(cors());

app.use("/api/v1",chatRoutes);

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})


