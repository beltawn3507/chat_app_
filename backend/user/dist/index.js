import express from "express";
import dotenv from 'dotenv';
import connectDB from "./config/db.js";
import { createClient } from "redis";
import UserRoutes from "./routes/user.js";
import { connectRabbitMq } from "./config/rabbitmq.js";
dotenv.config();
const PORT = process.env.PORT;
connectDB();
connectRabbitMq();
export const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: true
    }
});
redisClient.on("error", function (err) {
    console.log(err);
});
const app = express();
app.use(express.json());
//api endpoints
app.use("/api/v1", UserRoutes);
async function startServer() {
    try {
        await redisClient.connect().then(() => console.log("connected to redis")).catch(() => console.log("Error"));
        app.listen(PORT, () => {
            console.log(`SERVER running on ${PORT}`);
        });
    }
    catch {
        console.error("Redis Connection error");
    }
}
;
startServer();
