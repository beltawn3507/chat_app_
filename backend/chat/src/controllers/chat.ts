import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middleware/isAuth.js";
import { Chat } from "../model/Chat.js";
import { Message } from "../model/Message.js";
import axios from "axios";

export const createNewChat=TryCatch(async(req:AuthenticatedRequest,res)=>{
    const userId=req.user?._id;
    const {otherUserId} = req.body;

    
    if(!otherUserId){
        res.status(400).json({
            message:"Other User Id is not present "
        });
        return;
    }
    //check if already a chat exists
    const alreadyExists = await Chat.findOne({
        users:{$all : [userId,otherUserId],$size:2},
    });

    if(alreadyExists){
        res.json({
            message:"Chat already exists",
            chatId:alreadyExists._id,
        })
        return;
    }

    const newchat=await Chat.create({
        users:[userId,otherUserId],
    });

    res.status(200).json({
        message:"chta created",
        ChatId:newchat._id
    });
});

export const getAllChats = TryCatch(async(req:AuthenticatedRequest,res)=>{
    const userId=req.user?._id;
    if(!userId){
        res.status(400).json({
            message:"UserId missing"
        });
        return ;
    }

    const chats=await Chat.find({users:userId}).sort({updatedAt:-1})

    const chatWithUserData = await Promise.all(
        chats.map(async (chat)=>{
            const otherUserId = chat.users.find((id)=>id != userId);

            const unseenCount=await Message.countDocuments({
                chatId:chat._id,
                sender:{$ne:userId},
                seen:false
            });

            //fetch the user deatils of all the chat user from user microservice

            try {
                const {data} = await axios.get(
                    `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
                );

                return {
                    user:data,
                    chat:{
                        ...chat.toObject(),
                        latestMessage:chat.latestMessage||null,
                        unseenCount,
                    }
                };
            } catch (error) {
                console.log(error);
                return {
                    user:{_id:otherUserId,name:"Unknow User"},
                    chat:{
                        ...chat.toObject(),
                        latestMessage:chat.latestMessage||null,
                        unseenCount,
                    }
                };
            }
        })
    )

    res.json({
        chats:chatWithUserData,
    });
});

