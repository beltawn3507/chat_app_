import jwt from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decodevalue = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodevalue || !decodevalue.user) {
            res.status(401).json({
                message: "Invalid token",
            });
            return;
        }
        req.user = decodevalue.user;
        next();
    }
    catch (error) {
        res.status(401).json({
            message: "Please Login - JWT error",
        });
    }
};
export default isAuth;
