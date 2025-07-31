import { publishtoQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";

export const loginUser= TryCatch(async(req,res)=>{
    const {email}=req.body;
    //applying ratelimit using redis
    const rateLimitKey= `otp:ratelimit:${email}`;
    const rateLimit=await redisClient.get(rateLimitKey);

    if(rateLimit){
        //we wont allow user to send otp 
        res.status(429).json({
            message:"Too Many Requests . Please wait before requesting new otp"
        });
        return ;
    }

    const otp=Math.floor(100000 + Math.random()*900000).toString();
    const otpKey=`otp:${email}`;
    //setting otpkey and otp to redis
    await redisClient.set(otpKey,otp,{
        EX:300,
    });
    // setting ratelimitkey and the email to redis client . otp rate limit 1/min
    await redisClient.set(rateLimitKey,"true",{
        EX:60
    });

    const message={
        to:email,
        subject:"Your Otp code ",
        body:`Your Otp is ${otp} . It is valid for 5 minutes . `
    };

    await publishtoQueue("send-otp",message);
    res.status(200).json({
        message:"OTP sent to your mail"
    })
})