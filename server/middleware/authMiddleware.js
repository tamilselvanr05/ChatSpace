const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {

        // Get Authorization header
        const authHeader = req.headers.authorization;

        // Check whether token exists
        if (!authHeader) {
            return res.status(401).json({
                message: "No token provided"
            });
        }

        // Get token from "Bearer TOKEN"
        const token = authHeader.split(" ")[1];

        // Check token format
        if (!token) {
            return res.status(401).json({
                message: "Invalid token format"
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store decoded information in req.user
        req.user = decoded;

        // Go to the next function/route
        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
};

module.exports = authMiddleware;