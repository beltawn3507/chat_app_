import { generateToken } from "../config/generateToken.js";
import { publishtoQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { AuthenticatedRequest } from "../middleware/isAuth.js";
import { User } from "../model/user.js";

export const loginUser = TryCatch(async (req, res) => {
  const { email } = req.body;
  //applying ratelimit using redis
  const rateLimitKey = `otp:ratelimit:${email}`;
  const rateLimit = await redisClient.get(rateLimitKey);

  if (rateLimit) {
    //we wont allow user to send otp
    res.status(429).json({
      message: "Too Many Requests . Please wait before requesting new otp",
    });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpKey = `otp:${email}`;
  //setting otpkey and otp to redis
  await redisClient.set(otpKey, otp, {
    EX: 300,
  });
  // setting ratelimitkey and the email to redis client . otp rate limit 1/min
  await redisClient.set(rateLimitKey, "true", {
    EX: 60,
  });
  const message = {
    to: email,
    subject: "Your Otp code ",
    body: `Your Otp is ${otp} . It is valid for 5 minutes . `,
  };
  await publishtoQueue("send-otp", message);
  res.status(200).json({
    message: "OTP sent to your mail",
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { email, otp: enteredOtp } = req.body;
  if (!email || !enteredOtp) {
    res.status(400).json({
      message: "Email And Otp Required",
    });
    return;
  }

  const otpkey = `otp:${email}`;
  const storedOtp = await redisClient.get(otpkey);

  if (!storedOtp || storedOtp !== enteredOtp) {
    res.status(400).json({
      message: "Invalid or expired OTP",
    });
    return;
  }

  await redisClient.del(otpkey);
  let user=await User.findOne({email});
  if(!user){
    const name=email.slice(0,8);
    user=await User.create({name,email});
  }
  //create a jsonwebtoken of login session
  const token=generateToken(user);
  res.json({
    message:"User Verified",
    user,
    token
  });

});

export const myProfile=TryCatch(async(req:AuthenticatedRequest,res)=>{
  const user=req.user;
  res.json(user);
});

export const updateName=TryCatch(async(req:AuthenticatedRequest,res)=>{
    const user= await User.findById(req.user?._id);
    if(!user){
      res.status(404).json({
        message:"Pls Login"
      })
      return ;
    }
    user.name=req.body.name;
    await user.save();

    const token=generateToken(user);
    res.json({
      message:"Name Successfully changed",
      user,
      token
    })
});

export const getAllProfiles=TryCatch(async(req:AuthenticatedRequest,res)=>{
  //we need to get all the data of the users and send it to the frontend
  const users=await User.find();
  res.json({
    users
  })
});

export const getAUser=TryCatch(async(req:AuthenticatedRequest,res)=>{
  const user=await User.findById(req.params.id);
  res.json({
    user
  })
});

