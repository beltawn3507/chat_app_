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

export const sendMessage = TryCatch(async(req:AuthenticatedRequest,res)=>{
    const senderId=req.user?._id;
    const {chatId,text} = req.body;
    const imageFile=req.file;

    if(!senderId){
        res.status(401).json({
            message:"unauthorised"
        });
        return;
    }

    if(!chatId){
        res.status(401).json({
            message:"ChatId is not present"
        });
        return;
    }

    if(!text && !imageFile){
        res.status(400).json({
            message:"Either text or image is required",
        });
        return;
    }

    const chat = await Chat.findById(chatId);

    if(!chat){
        res.status(404).json({
            message:"Chat Not found"
        })
        return ;
    }

    const isUserinChat=chat.users.some(
        (userId)=> userId.toString() === senderId.toString()
    );

    if(!isUserinChat){
        res.status(403).json({
            message:"Your are not the participant of this chat"
        })
        return ;
    }

    const otherUserId = chat.users.find(
        (userId)=> userId.toString() !== senderId.toString()
    )

    if (!otherUserId) {
    res.status(401).json({
      message: "No other user",
    });
    return;
  }

  //socket setup 


  let messageData:any ={
    chatId:chatId,
    sender:senderId,
    seen:false,
    seenAt:undefined
  };

  if(imageFile){
    messageData.image={
        url:imageFile.path,
        publicId:imageFile.filename
    };
    messageData.messageType="image";
    messageData.text=text||"";
  }else{
    messageData.messageType="text";
    messageData.text=text||"";
  }

  const message = new Message(messageData);
  const savedMessage = await message.save();
  const latestMessageText = imageFile ? "Image" : text;
  
  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { new: true }
  );

  res.status(201).json({
    message:savedMessage,
    sender:senderId,
  });
});

export const getMessagesByChat=TryCatch(async(req:AuthenticatedRequest,res)=>{
    const userId=req.user?._id;
    const {chatId} = req.params;

     if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (!chatId) {
      res.status(400).json({
        message: "ChatId Required",
      });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({
        message: "Chat not found",
      });
      return;
    }

    const isUserInChat = chat.users.some(
      (userId) => userId.toString() === userId.toString()
    );

    if (!isUserInChat) {
      res.status(403).json({
        message: "You are not a participant of this chat",
      });
      return;
    }

    const messagesToMarkSeen = await Message.find({
      chatId: chatId,
      sender: { $ne: userId },
      seen: false,
    });

    await Message.updateMany(
      {
        chatId: chatId,
        sender: { $ne: userId },
        seen: false,
      },
      {
        seen: true,
        seenAt: new Date(),
      }
    );

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    const otherUserId = chat.users.find((id) => id !== userId);
    try {
      const { data } = await axios.get(
        `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
      );

      if (!otherUserId) {
        res.status(400).json({
          message: "No other user",
        });
        return;
      }

      //socket work
      

      res.json({
        messages,
        user: data,
      });
    } 
    catch (error) {
      console.log(error);
      res.json({
        messages,
        user: { _id: otherUserId, name: "Unknown User" },
      });
    }


})