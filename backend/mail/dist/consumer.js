import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
export const startSendOtpConsumer = async () => {
    try {
        const connection = await amqp.connect({
            protocol: "amqp",
            hostname: process.env.RABBITMQ_HOST,
            port: 5672,
            username: process.env.RABBITMQ_USERNAME,
            password: process.env.RABBITMQ_PASSWORD,
        });
        const channel = await connection.createChannel();
        const queueName = "send-otp";
        await channel.assertQueue(queueName, { durable: true });
        console.log("Connection successfull to rabbitmq 🐰");
        channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        auth: {
                            user: process.env.USER,
                            pass: process.env.PASSWORD
                        }
                    });
                    //sending mail using nodemailer
                    await transporter.sendMail({
                        from: "Chat-App",
                        to: to,
                        subject,
                        text: body
                    });
                    console.log(`otp mail send to ${to}`);
                    channel.ack(msg); //the consumer ack that the data from the queue is ack . so that the queue can delete this data
                }
                catch (error) {
                    console.log("Failed to send otp via nodemailer", error);
                }
            }
        });
    }
    catch (error) {
        console.log("Failed to start mail consumer", error);
    }
};
