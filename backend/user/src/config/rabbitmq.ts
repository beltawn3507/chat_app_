import amqp from "amqplib"

let channel:amqp.Channel;

export const connectRabbitMq=async()=>{
    try {
        const connection=await amqp.connect({
          protocol:"amqp",
          hostname:process.env.RABBITMQ_HOST,
          port:5672,
          username:process.env.RABBITMQ_USERNAME,
          password:process.env.RABBITMQ_PASSWORD
        })

        channel = await connection.createChannel();
        console.log("RabbitMq Connected"); 
    } catch (error) {
        console.log("Failed to connect to rabbitMq",error)
    }
}

export const publishtoQueue=async(queueName:string , message : any)=>{
    if(!channel){
        console.log("Rabbit Mq cahnnel is not initialised");
        return ;
    }
    await channel.assertQueue(queueName,{durable:true});
    channel.sendToQueue(queueName,Buffer.from(JSON.stringify(message)),{
        persistent:true
    });

}