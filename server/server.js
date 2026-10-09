const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Message = require("./models/message");
const Group = require("./models/group");
const authMiddleware = require("./middleware/authMiddleware");

// Socket.IO imports
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const uploadFolder = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

app.use(
    "/uploads",
    express.static(uploadFolder)
);

const storage = multer.diskStorage({

    destination: (
        req,
        file,
        cb
    ) => {

        cb(
            null,
            uploadFolder
        );

    },

    filename: (
        req,
        file,
        cb
    ) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1E9
            ) +
            path.extname(
                file.originalname
            );

        cb(
            null,
            uniqueName
        );

    }

});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.post("/groups", authMiddleware, async (req, res) => {

    try {

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({
                message: "A JSON request body is required"
            });
        }

        const { name, members } = req.body;

        if (typeof name !== "string" || !name.trim()) {

            return res.status(400).json({
                message: "Group name is required"
            });

        }

        if (!Array.isArray(members)) {

            return res.status(400).json({
                message: "Members must be an array"
            });

        }

        const adminId = req.user.userId;

        const invalidMembers = members.some(
            (memberId) =>
                typeof memberId !== "string" ||
                !mongoose.Types.ObjectId.isValid(memberId)
        );

        if (
            !mongoose.Types.ObjectId.isValid(adminId) ||
            invalidMembers
        ) {
            return res.status(400).json({
                message: "Invalid admin or member ID"
            });
        }

        const allMembers = [
            adminId,
            ...members
        ];

        const uniqueMembers = [
            ...new Set(
                allMembers.map(
                    (id) => id.toString()
                )
            )
        ];

        const existingUsers = await User.find({
            _id: { $in: uniqueMembers }
        }).select("_id");

        if (existingUsers.length !== uniqueMembers.length) {
            return res.status(400).json({
                message: "One or more members were not found"
            });
        }

        const group = new Group({
            name: name.trim(),
            members: uniqueMembers,
            admin: adminId
        });

        await group.save();

        res.status(201).json({
            message: "Group created successfully",
            group: group
        });

    } catch (error) {

        console.log("Create group error:", error);

        res.status(500).json({
            message: "Failed to create group"
        });

    }

});

app.get("/groups", authMiddleware, async (req, res) => {

    try {

        const userId = req.user.userId;

        const groups = await Group.find({
            members: userId
        }).populate(
            "members",
            "username email"
        );

        res.status(200).json({
            message: "Groups fetched successfully",
            groups: groups
        });

    } catch (error) {

        console.log("Get groups error:", error);

        res.status(500).json({
            message: "Failed to fetch groups"
        });

    }

});

app.put("/groups/:groupId/members", authMiddleware, async (req, res) => {

    try {

        const { groupId } = req.params;
        const { members } = req.body;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                message: "Invalid group ID"
            });
        }

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({
                message: "Members must be an array"
            });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const adminId = req.user.userId;

        if (group.admin.toString() !== adminId.toString()) {
            return res.status(403).json({
                message: "Only the group admin can add members"
            });
        }

        const invalidMembers = members.some(
            (memberId) =>
                !mongoose.Types.ObjectId.isValid(memberId)
        );

        if (invalidMembers) {
            return res.status(400).json({
                message: "Invalid member ID"
            });
        }

        const uniqueRequestedMembers = [
            ...new Set(members.map((memberId) => memberId.toString()))
        ];

        const users = await User.find({
            _id: { $in: uniqueRequestedMembers }
        }).select("_id username email");

        if (users.length !== uniqueRequestedMembers.length) {
            return res.status(400).json({
                message: "One or more users were not found"
            });
        }

        const existingMembers = group.members.map(
            (memberId) => memberId.toString()
        );

        const newMembers = uniqueRequestedMembers.filter(
            (memberId) => !existingMembers.includes(memberId)
        );

        if (newMembers.length === 0) {
            return res.status(400).json({
                message: "Users are already group members"
            });
        }

        group.members.push(...newMembers);

        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "username email");

        res.status(200).json({
            message: "Members added successfully",
            group: updatedGroup
        });

    } catch (error) {

        console.log("Add group members error:", error);

        res.status(500).json({
            message: "Failed to add members"
        });

    }

});

app.get("/groups/:groupId/messages", authMiddleware, async (req, res) => {

    try {

        const { groupId } = req.params;
        const currentUserId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                message: "Invalid group ID"
            });
        }

        const group = await Group.findOne({
            _id: groupId,
            members: currentUserId
        });

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const messages = await Message.find({
            groupId: groupId,
            deletedFor: {
                $ne: currentUserId
            }
        }).sort({ createdAt: 1 });

        res.status(200).json({
            message: "Group messages fetched successfully",
            messages: messages
        });

    } catch (error) {

        console.log("Get group messages error:", error);

        res.status(500).json({
            message: "Failed to fetch group messages"
        });

    }

});

app.post(
    "/upload",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "No file uploaded"
                });
            }

            const fileUrl = `/uploads/${req.file.filename}`;
            const isImage = req.file.mimetype.startsWith("image/");

            res.status(200).json({
                message: "File uploaded successfully",
                file: {
                    fileName: req.file.originalname,
                    fileUrl: fileUrl,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    messageType: isImage ? "image" : "file"
                }
            });

        } catch (error) {

            console.log("Upload error:", error);

            res.status(500).json({
                message: "File upload failed"
            });

        }

    }
);

// ==================== SOCKET.IO ====================

// ==================== SOCKET.IO ====================

// ==================== SOCKET.IO ====================

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join", async (userId) => {

        try {

            socket.userId = userId;

            socket.join(userId);

            await User.findByIdAndUpdate(
                userId,
                { isOnline: true }
            );

            io.emit("userStatusChanged", {
                userId: userId,
                isOnline: true
            });

            console.log(`User ${userId} joined room`);
            console.log(`User ${userId} is online`);

        } catch (error) {

            console.log("Join error:", error);

        }

    });

    socket.on("typing", (data) => {

        const {
            senderId,
            receiverId,
            isTyping
        } = data;

        io.to(receiverId).emit("userTyping", {
            senderId,
            isTyping
        });

    });

    socket.on("sendMessage", async (data) => {

        try {

            const {
                senderId,
                receiverId,
                message,
                messageType,
                fileName,
                fileUrl,
                fileType,
                fileSize,
                replyTo
            } = data;

            console.log("Message received:", data);

            const newMessage = new Message({
                senderId,
                receiverId,
                message,
                messageType: messageType || "text",
                fileName: fileName || null,
                fileUrl: fileUrl || null,
                fileType: fileType || null,
                fileSize: fileSize || null,
                replyTo: replyTo || null
            });

            await newMessage.save();

            io.to(receiverId).emit(
                "receiveMessage",
                newMessage
            );

            io.to(senderId).emit(
                "receiveMessage",
                newMessage
            );

            console.log("Message sent successfully");

        } catch (error) {

            console.log("Socket message error:", error);

        }

    });

    socket.on("sendGroupMessage", async (data) => {

        try {

            const {
                senderId,
                groupId,
                message,
                messageType,
                fileName,
                fileUrl,
                fileType,
                fileSize,
                replyTo
            } = data;

            console.log(
                "Group message received:",
                data
            );

            const group = await Group.findById(groupId);

            if (!group) {

                console.log("Group not found");

                return;
            }

            const isMember = group.members.some(
                (memberId) =>
                    memberId.toString() ===
                    senderId.toString()
            );

            if (!isMember) {

                console.log(
                    "User is not a group member"
                );

                return;
            }

            const newMessage = new Message({
                senderId: senderId,
                groupId: groupId,
                message: message,
                messageType: messageType || "text",
                fileName: fileName || null,
                fileUrl: fileUrl || null,
                fileType: fileType || null,
                fileSize: fileSize || null,
                replyTo: replyTo || null
            });

            await newMessage.save();

            group.members.forEach((memberId) => {

                io.to(memberId.toString()).emit(
                    "receiveGroupMessage",
                    newMessage
                );

            });

            console.log(
                "Group message sent successfully"
            );

        } catch (error) {

            console.log(
                "Group message error:",
                error
            );

        }

    });

    socket.on("deleteMessage", async (data) => {

        try {

            const {
                messageId,
                senderId,
                receiverId,
                groupId,
                deleteFor
            } = data;

            if (deleteFor === "me") {

                const message = await Message.findById(messageId);

                if (!message) {
                    return;
                }

                if (message.groupId) {

                    const group = await Group.findOne({
                        _id: message.groupId,
                        members: senderId
                    });

                    if (
                        !group ||
                        message.groupId.toString() !== groupId?.toString()
                    ) {
                        return;
                    }

                } else if (
                    message.senderId.toString() !== senderId.toString() &&
                    message.receiverId?.toString() !== senderId.toString()
                ) {
                    return;
                }

                await Message.findByIdAndUpdate(
                    messageId,
                    {
                        $addToSet: {
                            deletedFor: senderId
                        }
                    }
                );

                io.to(senderId).emit(
                    "messageDeletedForMe",
                    {
                        messageId: messageId
                    }
                );

                console.log(
                    "Message deleted for me:",
                    messageId
                );

                return;
            }

            if (deleteFor === "everyone") {

                if (groupId) {

                    const group = await Group.findOne({
                        _id: groupId,
                        members: senderId
                    });

                    if (!group) {
                        return;
                    }

                    const deletedMessage =
                        await Message.findOneAndDelete({
                            _id: messageId,
                            senderId: senderId,
                            groupId: groupId
                        });

                    if (!deletedMessage) {
                        console.log(
                            "Group message not found or delete not allowed"
                        );
                        return;
                    }

                    group.members.forEach((memberId) => {
                        io.to(memberId.toString()).emit(
                            "messageDeleted",
                            {
                                messageId: messageId
                            }
                        );
                    });

                    console.log(
                        "Group message deleted for everyone:",
                        messageId
                    );

                    return;
                }

                const deletedMessage =
                    await Message.findOneAndDelete({
                        _id: messageId,
                        senderId: senderId,
                        receiverId: receiverId
                    });

                if (!deletedMessage) {

                    console.log(
                        "Message not found or delete not allowed"
                    );

                    return;
                }

                io.to(senderId).emit(
                    "messageDeleted",
                    {
                        messageId: messageId
                    }
                );

                io.to(receiverId).emit(
                    "messageDeleted",
                    {
                        messageId: messageId
                    }
                );

                console.log(
                    "Message deleted for everyone:",
                    messageId
                );
            }

        } catch (error) {

            console.log(
                "Delete message error:",
                error
            );

        }

    });

    socket.on("starMessage", async (data) => {

        try {

            const { messageId, userId } = data;

            if (
                !mongoose.Types.ObjectId.isValid(messageId) ||
                !mongoose.Types.ObjectId.isValid(userId) ||
                (socket.userId &&
                    socket.userId.toString() !== userId.toString())
            ) {
                return;
            }

            const message = await Message.findById(messageId);

            if (!message) {
                return;
            }

            let recipientIds;

            if (message.groupId) {

                const group = await Group.findOne({
                    _id: message.groupId,
                    members: userId
                });

                if (!group) {
                    return;
                }

                recipientIds = group.members.map(
                    (memberId) => memberId.toString()
                );

            } else {

                const isParticipant =
                    message.senderId.toString() === userId.toString() ||
                    message.receiverId?.toString() === userId.toString();

                if (!isParticipant) {
                    return;
                }

                recipientIds = [
                    message.senderId.toString(),
                    message.receiverId?.toString()
                ].filter(Boolean);

            }

            message.starredBy = message.starredBy || [];

            const alreadyStarred = message.starredBy.some(
                (starredUserId) =>
                    starredUserId.toString() === userId.toString()
            );

            if (alreadyStarred) {
                message.starredBy = message.starredBy.filter(
                    (starredUserId) =>
                        starredUserId.toString() !== userId.toString()
                );
            } else {
                message.starredBy.push(userId);
            }

            await message.save();

            const update = {
                messageId: message._id.toString(),
                starredBy: message.starredBy.map(
                    (starredUserId) => starredUserId.toString()
                )
            };

            recipientIds.forEach((recipientId) => {
                io.to(recipientId).emit(
                    "messageStarUpdated",
                    update
                );
            });

        } catch (error) {

            console.log("Star message error:", error);

        }

    });

    socket.on("messageDelivered", async (data) => {

        try {

            const { messageId, userId } = data;

            if (
                !mongoose.Types.ObjectId.isValid(messageId) ||
                !mongoose.Types.ObjectId.isValid(userId) ||
                (socket.userId &&
                    socket.userId.toString() !== userId.toString())
            ) {
                return;
            }

            const message = await Message.findOne({
                _id: messageId,
                receiverId: userId
            });

            if (!message) {
                return;
            }

            message.deliveredTo = message.deliveredTo || [];

            const alreadyDelivered = message.deliveredTo.some(
                (deliveredUserId) =>
                    deliveredUserId.toString() === userId.toString()
            );

            if (!alreadyDelivered) {
                message.deliveredTo.push(userId);
                await message.save();
            }

            io.to(message.senderId.toString()).emit(
                "messageStatusUpdated",
                {
                    messageId: message._id.toString(),
                    deliveredTo: message.deliveredTo.map(
                        (deliveredUserId) => deliveredUserId.toString()
                    ),
                    readBy: (message.readBy || []).map(
                        (readerId) => readerId.toString()
                    )
                }
            );

        } catch (error) {

            console.log("Delivery status error:", error);

        }

    });

    socket.on("messageRead", async (data) => {

        try {

            const { messageId, userId } = data;

            if (
                !mongoose.Types.ObjectId.isValid(messageId) ||
                !mongoose.Types.ObjectId.isValid(userId) ||
                (socket.userId &&
                    socket.userId.toString() !== userId.toString())
            ) {
                return;
            }

            const message = await Message.findById(messageId);

            if (!message || message.senderId.toString() === userId.toString()) {
                return;
            }

            if (message.groupId) {
                const group = await Group.findOne({
                    _id: message.groupId,
                    members: userId
                });

                if (!group) {
                    return;
                }
            } else if (
                message.receiverId?.toString() !== userId.toString()
            ) {
                return;
            }

            message.readBy = message.readBy || [];
            message.deliveredTo = message.deliveredTo || [];

            const alreadyRead = message.readBy.some(
                (readerId) =>
                    readerId.toString() === userId.toString()
            );
            const alreadyDelivered = message.deliveredTo.some(
                (deliveredUserId) =>
                    deliveredUserId.toString() === userId.toString()
            );

            if (!alreadyRead) {
                message.readBy.push(userId);
            }

            if (!alreadyDelivered) {
                message.deliveredTo.push(userId);
            }

            if (!alreadyRead || !alreadyDelivered) {
                await message.save();
            }

            io.to(message.senderId.toString()).emit(
                "messageStatusUpdated",
                {
                    messageId: message._id.toString(),
                    deliveredTo: message.deliveredTo.map(
                        (deliveredUserId) => deliveredUserId.toString()
                    ),
                    readBy: message.readBy.map(
                        (readerId) => readerId.toString()
                    )
                }
            );

        } catch (error) {

            console.log("Read status error:", error);

        }

    });

    const relayCallEvent = (eventName, data = {}) => {
        const { from, to } = data;

        if (
            !socket.userId ||
            socket.userId.toString() !== from?.toString() ||
            !mongoose.Types.ObjectId.isValid(to)
        ) {
            return;
        }

        io.to(to.toString()).emit(eventName, {
            ...data,
            from: socket.userId.toString()
        });
    };

    [
        "call:offer",
        "call:answer",
        "call:ice-candidate",
        "call:reject",
        "call:busy",
        "call:end"
    ].forEach((eventName) => {
        socket.on(eventName, (data) => {
            relayCallEvent(eventName, data);
        });
    });
     

    socket.on("disconnect", async () => {

        console.log("User disconnected:", socket.id);

        try {

            if (socket.userId) {

                await User.findByIdAndUpdate(
                    socket.userId,
                    { isOnline: false }
                );

                io.emit("userStatusChanged", {
                    userId: socket.userId,
                    isOnline: false
                });

                console.log(
                    `User ${socket.userId} is offline`
                );

            }

        } catch (error) {

            console.log(
                "Disconnect status error:",
                error
            );

        }

    });

});

// ==================== NORMAL ROUTES ====================

app.get("/", (req, res) => {
    res.send("Chat Application Backend Running");
});

app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: newUser
        });

    } catch (error) {
        res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

app.get("/profile", authMiddleware, async (req, res) => {

    try {

        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user: user
        });

    } catch (error) {

        console.log("Profile error:", error);

        res.status(500).json({
            message: "Failed to fetch profile"
        });

    }

});

app.put("/profile", authMiddleware, async (req, res) => {

    try {

        const { username, about } = req.body;

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (username) {
            user.username = username.trim();
        }

        if (typeof about === "string") {
            user.about = about.trim();
        }

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                username: user.username,
                email: user.email,
                about: user.about,
                profilePhoto: user.profilePhoto
            }
        });

    } catch (error) {

        console.log("Update profile error:", error);

        res.status(500).json({
            message: "Failed to update profile"
        });

    }

});

app.put(
    "/profile/photo",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "No photo uploaded"
                });
            }

            if (!req.file.mimetype.startsWith("image/")) {
                return res.status(400).json({
                    message: "Only image files are allowed"
                });
            }

            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const photoUrl = `/uploads/${req.file.filename}`;

            user.profilePhoto = photoUrl;

            await user.save();

            res.status(200).json({
                message: "Profile photo updated",
                profilePhoto: photoUrl
            });

        } catch (error) {

            console.log("Profile photo error:", error);

            res.status(500).json({
                message: "Failed to update profile photo"
            });

        }

    }
);

app.delete(
    "/profile/photo",
    authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if (!user.profilePhoto) {
                return res.status(400).json({
                    message: "No profile photo to remove"
                });
            }

            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, user.profilePhoto);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            user.profilePhoto = null;
            await user.save();

            res.status(200).json({
                message: "Profile photo removed successfully"
            });

        } catch (error) {
            console.log("Remove profile photo error:", error);
            res.status(500).json({
                message: "Failed to remove profile photo"
            });
        }
    }
);

app.get("/users", authMiddleware, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.user.userId }
        }).select("-password");

        res.status(200).json({
            message: "Users fetched successfully",
            users: users
        });

    } catch (error) {
        res.status(500).json({
            message: "Error getting users",
            error: error.message
        });
    }
});

app.post("/messages", authMiddleware, async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({
                message: "Receiver ID and message are required"
            });
        }

        const newMessage = new Message({
            senderId: req.user.userId,
            receiverId: receiverId,
            message: message
        });

        await newMessage.save();

        res.status(201).json({
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to send message",
            error: error.message
        });
    }
});

app.get("/messages/:userId", authMiddleware, async (req, res) => {

    try {

        const currentUserId = req.user.userId;
        const otherUserId = req.params.userId;

        const messages = await Message.find({
            $or: [
                {
                    senderId: currentUserId,
                    receiverId: otherUserId
                },
                {
                    senderId: otherUserId,
                    receiverId: currentUserId
                }
            ],
            deletedFor: {
                $ne: currentUserId
            }
        }).sort({ createdAt: 1 });

        res.status(200).json({
            message: "Messages fetched successfully",
            messages: messages
        });

    } catch (error) {

        console.log("Fetch messages error:", error);

        res.status(500).json({
            message: "Failed to fetch messages"
        });

    }

});

// ==================== TEMPORARY PASSWORD RESET ====================

app.put("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Password reset successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Password reset failed",
            error: error.message
        });
    }
});

// ==================== MONGODB + SERVER ====================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");

        server.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB Connection Failed:", error);
    });

    