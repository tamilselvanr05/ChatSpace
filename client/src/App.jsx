import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import socket from "./socket";
import CallOverlay from "./components/CallOverlay";
import Cropper from "react-easy-crop";
import {
    ArrowLeft,
    Bell,
    Camera,
    ChevronDown,
    ChevronRight,
    Check,
    FileText,
    Image,
    Loader,
    LogOut,
    MessageCircle,
    Mic,
    Minus,
    MoreVertical,
    Paperclip,
    Palette,
    Phone,
    LockKeyhole,
    Plus,
    RotateCcw,
    RotateCw,
    Search,
    Send,
    Settings,
    Shield,
    Smile,
    StopCircle,
    Trash2,
    UserRound,
    UsersRound,
    Video,
    X,
    ZoomIn,
    ZoomOut,
    Info
} from "lucide-react";



const playNotificationSound = () => {
    if (localStorage.getItem("chatspace_notifications") === "false") {
        return;
    }

    if (localStorage.getItem("chatspace_sound") === "false") {
        return;
    }

    const AudioContext =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audioContext = new AudioContext();

    audioContext.resume().then(() => {
        const playTone = (frequency, delay, duration) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const start = audioContext.currentTime + delay;

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, start);

            gain.gain.setValueAtTime(0.001, start);
            gain.gain.exponentialRampToValueAtTime(0.2, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(start);
            oscillator.stop(start + duration);
        };

        playTone(880, 0, 0.12);
        playTone(1174.66, 0.14, 0.18);

        setTimeout(() => audioContext.close(), 700);
    }).catch((error) => {
        console.error("Notification sound error:", error);
    });
};
function App() {
    const navigate = useNavigate();

    const [userId, setUserId] = useState("");
    const [profileUser, setProfileUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [search, setSearch] = useState("");
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [messageNotification, setMessageNotification] = useState(null);
    const [messageSearch, setMessageSearch] = useState("");
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAttachment, setShowAttachment] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupMembers, setNewGroupMembers] = useState([]);
    const [activeFilter, setActiveFilter] = useState("all");
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [editingAbout, setEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState("");
    const [aboutError, setAboutError] = useState("");
    const [aboutSaving, setAboutSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const fileInputRef = useRef(null);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [showPhotoEditor, setShowPhotoEditor] = useState(false);
    const [editImageUrl, setEditImageUrl] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [removingPhoto, setRemovingPhoto] = useState(false);
    const [showViewPhoto, setShowViewPhoto] = useState(false);
    const [theme, setTheme] = useState(
        () => localStorage.getItem("chatspace-theme") || "ocean"
    );
    const [callState, setCallState] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callError, setCallError] = useState("");

    const messageEndRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("chatspace-theme", theme);
    }, [theme]);

useEffect(() => {
    if (!messageNotification) {
        return;
    }

    const timer = setTimeout(() => {
        setMessageNotification(null);
    }, 15000);

    return () => {
        clearTimeout(timer);
    };
}, [messageNotification]);

    useEffect(() => {
        const syncInfoPanel = () => {
            setShowInfoPanel(window.innerWidth > 1180);
        };

        window.addEventListener("resize", syncInfoPanel);
        return () => window.removeEventListener("resize", syncInfoPanel);
    }, []);

    const markMessagesAsRead = (messageList) => {
        messageList.forEach((msg) => {
            if (
                msg.senderId?.toString() !==
                    userId?.toString() &&
                msg._id
            ) {
                socket.emit("messageRead", {
                    messageId: msg._id,
                    userId: userId
                });
            }
        });
    };

    const handleEditAbout = () => {
        setAboutText(selectedUser?.about || "");
        setAboutError("");
        setEditingAbout(true);
    };

    const handleCancelAbout = () => {
        setAboutText(selectedUser?.about || "");
        setAboutError("");
        setEditingAbout(false);
    };

    const handleSaveAbout = async () => {
        if (!selectedUser) return;
        setAboutSaving(true);
        setAboutError("");
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.put(
                "http://localhost:3030/profile",
                { about: aboutText.trim() },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            setSelectedUser((prev) =>
                prev ? { ...prev, about: response.data.user.about } : prev
            );
            setEditingAbout(false);
        } catch (error) {
            setAboutError(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to update About. Please try again."
            );
        } finally {
            setAboutSaving(false);
        }
    };

    const handlePhotoClick = () => {
        if (selectedUser) {
            setShowPhotoMenu(true);
        }
    };

    const closePhotoMenu = () => {
        setShowPhotoMenu(false);
    };

    const handleViewPhoto = () => {
        if (selectedUser?.profilePhoto) {
            setShowViewPhoto(true);
        }
        closePhotoMenu();
    };

    const handleChangePhoto = () => {
        closePhotoMenu();
        fileInputRef.current?.click();
    };

    const handleRemovePhoto = async () => {
        if (!selectedUser || !selectedUser.profilePhoto) return;

        const confirmed = window.confirm(
            "Are you sure you want to remove your profile photo? This action cannot be undone."
        );
        if (!confirmed) {
            closePhotoMenu();
            return;
        }

        closePhotoMenu();
        setRemovingPhoto(true);
        setPhotoError("");

        try {
            const token = sessionStorage.getItem("token");
            await axios.delete("http://localhost:3030/profile/photo", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setSelectedUser((prev) =>
                prev ? { ...prev, profilePhoto: null } : prev
            );

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user._id === userId ? { ...user, profilePhoto: null } : user
                )
            );

            setProfileUser((prev) =>
                prev ? { ...prev, profilePhoto: null } : prev
            );

        } catch (error) {
            setPhotoError(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to remove photo. Please try again."
            );
        } finally {
            setRemovingPhoto(false);
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please select an image file.");
            e.target.value = "";
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setPhotoError("Image size must be less than 5 MB.");
            e.target.value = "";
            return;
        }

        setPhotoError("");
        const objectUrl = URL.createObjectURL(file);
        setEditImageUrl(objectUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setShowPhotoEditor(true);
        e.target.value = "";
    };

    const handleCropComplete = async (croppedCanvas) => {
        if (!croppedCanvas) return;

        setUploadingPhoto(true);
        setPhotoError("");

        try {
            const token = sessionStorage.getItem("token");
            const blob = await new Promise((resolve) =>
                croppedCanvas.toBlob(resolve, "image/jpeg", 0.9)
            );
            const formData = new FormData();
            formData.append("file", blob, "profile.jpg");

            const response = await axios.put(
                "http://localhost:3030/profile/photo",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const newPhotoUrl = response.data.profilePhoto;

            setSelectedUser((prev) =>
                prev ? { ...prev, profilePhoto: newPhotoUrl } : prev
            );

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user._id === userId ? { ...user, profilePhoto: newPhotoUrl } : user
                )
            );

            setProfileUser((prev) =>
                prev ? { ...prev, profilePhoto: newPhotoUrl } : prev
            );

            setShowPhotoEditor(false);
            if (editImageUrl) {
                URL.revokeObjectURL(editImageUrl);
                setEditImageUrl(null);
            }

        } catch (error) {
            setPhotoError(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to upload photo. Please try again."
            );
        } finally {
            setUploadingPhoto(false);
        }
    };

    const closePhotoEditor = () => {
        setShowPhotoEditor(false);
        if (editImageUrl) {
            URL.revokeObjectURL(editImageUrl);
            setEditImageUrl(null);
        }
    };

    const closeViewPhoto = () => {
        setShowViewPhoto(false);
    };

    const closeCall = (notifyPeer = false) => {
        const peerId =
            callState?.peerId ||
            incomingCall?.from;

        if (notifyPeer && peerId) {
            socket.emit("call:end", {
                from: userId,
                to: peerId
            });
        }

        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        pendingIceCandidatesRef.current = [];
        localStreamRef.current?.getTracks().forEach((track) => {
            track.stop();
        });
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setIncomingCall(null);
        setCallState(null);
    };

    const createPeerConnection = (peerId) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });

        peerConnectionRef.current = peerConnection;

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("call:ice-candidate", {
                    from: userId,
                    to: peerId,
                    candidate: event.candidate
                });
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === "connected") {
                setCallState((previousCall) =>
                    previousCall
                        ? { ...previousCall, status: "active" }
                        : previousCall
                );
            }
        };

        return peerConnection;
    };

    const addPendingIceCandidates = async (peerConnection) => {
        const candidates = pendingIceCandidatesRef.current;
        pendingIceCandidatesRef.current = [];

        for (const candidate of candidates) {
            await peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        }
    };

    const startCall = async (callType) => {
        if (!selectedUser || callState || incomingCall) {
            return;
        }

        setCallError("");
        setCallState({
            status: "calling",
            callType,
            peerId: selectedUser._id,
            peerName: selectedUser.username
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === "video"
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            const peerConnection = createPeerConnection(
                selectedUser._id
            );

            stream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, stream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit("call:offer", {
                from: userId,
                to: selectedUser._id,
                fromName: profileUser?.username || "ChatSpace user",
                callType,
                offer: peerConnection.localDescription
            });

        } catch (error) {
            console.error("Could not start call:", error);
            setCallError(
                "Microphone or camera permission is required to call."
            );
            closeCall(false);
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) {
            return;
        }

        const call = incomingCall;
        setCallError("");
        setCallState({
            status: "connecting",
            callType: call.callType,
            peerId: call.from,
            peerName: call.fromName
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: call.callType === "video"
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            const peerConnection = createPeerConnection(call.from);
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(call.offer)
            );
            await addPendingIceCandidates(peerConnection);

            stream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, stream);
            });

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit("call:answer", {
                from: userId,
                to: call.from,
                answer: peerConnection.localDescription
            });

            setIncomingCall(null);

        } catch (error) {
            console.error("Could not accept call:", error);
            setCallError(
                "Microphone or camera permission is required to answer."
            );
            socket.emit("call:reject", {
                from: userId,
                to: call.from
            });
            closeCall(false);
        }
    };

    const rejectCall = () => {
        if (incomingCall) {
            socket.emit("call:reject", {
                from: userId,
                to: incomingCall.from
            });
        }

        closeCall(false);
    };

    const emojis = [
        "😀", "😂", "🤣", "😊", "😍", "😘",
        "😎", "😢", "😭", "😡", "👍", "👎",
        "❤️", "🔥", "🎉", "👏", "🙏", "💯",
        "🥳", "😇", "🤔", "😴", "😮", "❤️"
    ];

    useEffect(() => {
        const token = sessionStorage.getItem("token");

        if (!token) {
            window.location.href = "/";
            return;
        }

        try {
            const decoded = jwtDecode(token);

            setUserId(decoded.userId);

            const handleConnect = () => {
                console.log("Connected:", socket.id);

                socket.emit(
                    "join",
                    decoded.userId
                );
            };

            if (socket.connected) {
                handleConnect();
            } else {
                socket.on(
                    "connect",
                    handleConnect
                );
            }

            return () => {
                socket.off(
                    "connect",
                    handleConnect
                );
            };

        } catch (error) {
            console.log("Token error:", error);

            sessionStorage.removeItem("token");
            window.location.href = "/";
        }
    }, []);

    useEffect(() => {
        const handleCallOffer = (data) => {
            if (callState || incomingCall) {
                socket.emit("call:busy", {
                    from: userId,
                    to: data.from
                });
                return;
            }

            pendingIceCandidatesRef.current = [];
            setIncomingCall(data);
            setCallState({
                status: "incoming",
                callType: data.callType,
                peerId: data.from,
                peerName: data.fromName
            });
        };

        const handleCallAnswer = async (data) => {
            const peerConnection = peerConnectionRef.current;

            if (
                !peerConnection ||
                callState?.peerId?.toString() !== data.from?.toString()
            ) {
                return;
            }

            try {
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
                await addPendingIceCandidates(peerConnection);
                setCallState((previousCall) =>
                    previousCall
                        ? { ...previousCall, status: "connecting" }
                        : previousCall
                );
            } catch (error) {
                console.error("Could not connect call:", error);
                setCallError("Unable to connect this call.");
                closeCall(false);
            }
        };

        const handleCallIceCandidate = async (data) => {
            const expectedPeer =
                callState?.peerId || incomingCall?.from;

            if (
                expectedPeer?.toString() !==
                data.from?.toString()
            ) {
                return;
            }

            const peerConnection = peerConnectionRef.current;

            if (!peerConnection?.remoteDescription) {
                pendingIceCandidatesRef.current.push(
                    data.candidate
                );
                return;
            }

            try {
                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                );
            } catch (error) {
                console.error("ICE candidate error:", error);
            }
        };

        const handleCallReject = (data) => {
            if (
                callState?.peerId?.toString() ===
                data.from?.toString()
            ) {
                setCallError("The call was declined.");
                closeCall(false);
            }
        };

        const handleCallBusy = (data) => {
            if (
                callState?.peerId?.toString() ===
                data.from?.toString()
            ) {
                setCallError("This person is on another call.");
                closeCall(false);
            }
        };

        const handleCallEnd = (data) => {
            if (
                callState?.peerId?.toString() ===
                    data.from?.toString() ||
                incomingCall?.from?.toString() ===
                    data.from?.toString()
            ) {
                closeCall(false);
            }
        };

        socket.on("call:offer", handleCallOffer);
        socket.on("call:answer", handleCallAnswer);
        socket.on("call:ice-candidate", handleCallIceCandidate);
        socket.on("call:reject", handleCallReject);
        socket.on("call:busy", handleCallBusy);
        socket.on("call:end", handleCallEnd);

        return () => {
            socket.off("call:offer", handleCallOffer);
            socket.off("call:answer", handleCallAnswer);
            socket.off("call:ice-candidate", handleCallIceCandidate);
            socket.off("call:reject", handleCallReject);
            socket.off("call:busy", handleCallBusy);
            socket.off("call:end", handleCallEnd);
        };
    }, [userId, callState, incomingCall]);

    useEffect(() => {
        const getUsers = async () => {
            try {
                const token =
                    sessionStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:3030/users",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                setUsers(
                    response.data.users
                );

            } catch (error) {
                console.log(
                    error.response?.data ||
                    error.message
                );
            }
        };

        getUsers();

        const handleStatusChange = (data) => {
            setUsers((previousUsers) =>
                previousUsers.map((user) =>
                    user._id === data.userId
                        ? {
                            ...user,
                            isOnline: data.isOnline
                        }
                        : user
                )
            );

            setSelectedUser((previousUser) => {
                if (
                    previousUser &&
                    previousUser._id === data.userId
                ) {
                    return {
                        ...previousUser,
                        isOnline: data.isOnline
                    };
                }

                return previousUser;
            });
        };

        socket.on(
            "userStatusChanged",
            handleStatusChange
        );

        return () => {
            socket.off(
                "userStatusChanged",
                handleStatusChange
            );
        };
    }, []);

    useEffect(() => {
        const getGroups = async () => {
            try {
                const token =
                    sessionStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:3030/groups",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                setGroups(
                    response.data.groups
                );

            } catch (error) {
                console.log(
                    error.response?.data ||
                    error.message
                );
            }
        };

        getGroups();
    }, []);

    useEffect(() => {
        const getProfile = async () => {
            try {
                const token =
                    sessionStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:3030/profile",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setProfileUser(response.data.user);
            } catch (error) {
                console.log(
                    error.response?.data ||
                    error.message
                );
            }
        };

        getProfile();
    }, []);

    useEffect(() => {
        const handleReceiveMessage = (data) => {
            const sender =
                data.senderId?.toString();

            const receiver =
                data.receiverId?.toString();

            const currentUser =
                userId?.toString();

           if (receiver === currentUser) {
    socket.emit("messageDelivered", {
        messageId: data._id,
        userId: userId
    });

    if (sender !== currentUser) {
        playNotificationSound();
    }
}

            if (
                receiver === currentUser &&
                sender !== currentUser &&
                sender !== selectedUser?._id?.toString()
            ) {
                const senderUser = users.find(
                    (user) =>
                        user._id?.toString() === sender
                );
                const preview =
                    data.messageType === "image"
                        ? "Photo"
                        : data.messageType === "file"
                            ? data.fileName || "File"
                            : data.message || "";

                setUnreadCounts((previousCounts) => ({
                    ...previousCounts,
                    [sender]: (previousCounts[sender] || 0) + 1
                }));
                setLastMessages((previousMessages) => ({
                    ...previousMessages,
                    [sender]: preview
                }));
              
const showPreview = localStorage.getItem("chatspace_message_preview") !== "false";

   setMessageNotification({
    senderId: sender,
    senderName: senderUser?.username || "New message",
    message: showPreview ? preview : "You received a new message"
});
            }

            if (!selectedUser) {
                return;
            }

            const selectedId =
                selectedUser._id.toString();

            const isCurrentChat =
                (
                    sender === currentUser &&
                    receiver === selectedId
                ) ||
                (
                    sender === selectedId &&
                    receiver === currentUser
                );

            if (!isCurrentChat) {
                return;
            }

            if (sender !== currentUser) {
                socket.emit("messageRead", {
                    messageId: data._id,
                    userId: userId
                });
            }

            setMessages((previousMessages) => {
                const alreadyExists =
                    previousMessages.some(
                        (msg) =>
                            msg._id === data._id
                    );

                if (alreadyExists) {
                    return previousMessages;
                }

                return [
                    ...previousMessages,
                    data
                ];
            });
        };

        socket.on(
            "receiveMessage",
            handleReceiveMessage
        );

        return () => {
            socket.off(
                "receiveMessage",
                handleReceiveMessage
            );
        };
    }, [userId, selectedUser, users]);

    useEffect(() => {
        const handleReceiveGroupMessage = (data) => {
            if (
                !selectedGroup ||
                data.groupId?.toString() !==
                    selectedGroup._id?.toString()
            ) {
                return;
            }
if (
    data.senderId?.toString() !==
    userId?.toString()
) {
    socket.emit("messageRead", {
        messageId: data._id,
        userId: userId
    });

    
    playNotificationSound();
}

            setMessages((previousMessages) => {
                const alreadyExists =
                    previousMessages.some(
                        (msg) =>
                            msg._id === data._id
                    );

                if (alreadyExists) {
                    return previousMessages;
                }

                return [
                    ...previousMessages,
                    data
                ];
            });
        };

        socket.on(
            "receiveGroupMessage",
            handleReceiveGroupMessage
        );

        return () => {
            socket.off(
                "receiveGroupMessage",
                handleReceiveGroupMessage
            );
        };
    }, [selectedGroup, userId]);

    useEffect(() => {
        const handleUserTyping = (data) => {
            if (
                selectedUser &&
                data.senderId === selectedUser._id
            ) {
                setIsTyping(
                    data.isTyping
                );
            }
        };

        socket.on(
            "userTyping",
            handleUserTyping
        );

        return () => {
            socket.off(
                "userTyping",
                handleUserTyping
            );
        };
    }, [selectedUser]);

    useEffect(() => {
        const handleMessageDeleted = (data) => {
            setMessages(
                (previousMessages) =>
                    previousMessages.filter(
                        (msg) =>
                            msg._id !==
                            data.messageId
                    )
            );
        };

        const handleMessageDeletedForMe = (data) => {
            setMessages(
                (previousMessages) =>
                    previousMessages.filter(
                        (msg) =>
                            msg._id !==
                            data.messageId
                    )
            );
        };

        const handleMessageStatusUpdated = (data) => {
            setMessages((previousMessages) =>
                previousMessages.map((msg) =>
                    msg._id?.toString() ===
                    data.messageId?.toString()
                        ? {
                            ...msg,
                            deliveredTo: data.deliveredTo,
                            readBy: data.readBy
                        }
                        : msg
                )
            );
        };

        const handleMessageStarUpdated = (data) => {
            setMessages((previousMessages) =>
                previousMessages.map((msg) =>
                    msg._id?.toString() ===
                    data.messageId?.toString()
                        ? {
                            ...msg,
                            starredBy: data.starredBy
                        }
                        : msg
                )
            );
        };

        socket.on(
            "messageDeleted",
            handleMessageDeleted
        );

        socket.on(
            "messageDeletedForMe",
            handleMessageDeletedForMe
        );

        socket.on(
            "messageStatusUpdated",
            handleMessageStatusUpdated
        );

        socket.on(
            "messageStarUpdated",
            handleMessageStarUpdated
        );

        return () => {
            socket.off(
                "messageDeleted",
                handleMessageDeleted
            );

            socket.off(
                "messageDeletedForMe",
                handleMessageDeletedForMe
            );

            socket.off(
                "messageStatusUpdated",
                handleMessageStatusUpdated
            );

            socket.off(
                "messageStarUpdated",
                handleMessageStarUpdated
            );
        };
    }, []);

    useEffect(() => {
        if (!messageNotification) {
            return;
        }

        const timeoutId = window.setTimeout(
            () => setMessageNotification(null),
            5000
        );

        return () => window.clearTimeout(timeoutId);
    }, [messageNotification]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages]);

    const selectUser = async (user) => {
        setSelectedUser(user);
        setSelectedGroup(null);
        setUnreadCounts((previousCounts) => ({
            ...previousCounts,
            [user._id]: 0
        }));
        setMessages([]);
        setMessageSearch("");
        setShowMessageSearch(false);
        setReplyingTo(null);
        setIsTyping(false);
        setShowEmoji(false);
        setShowAttachment(false);
        setOpenMenu(null);

        try {
            const token =
                sessionStorage.getItem("token");

            const response = await axios.get(
                `http://localhost:3030/messages/${user._id}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const loadedMessages =
                response.data.messages;

            setMessages(loadedMessages);
            markMessagesAsRead(loadedMessages);

        } catch (error) {
            console.log(
                error.response?.data ||
                error.message
            );
        }
    };

    const selectGroup = async (group) => {
        setSelectedGroup(group);
        setSelectedUser(null);
        setMessages([]);
        setMessageSearch("");
        setShowMessageSearch(false);
        setReplyingTo(null);
        setIsTyping(false);
        setShowEmoji(false);
        setShowAttachment(false);
        setOpenMenu(null);

        try {
            const token =
                sessionStorage.getItem("token");

            const response = await axios.get(
                `http://localhost:3030/groups/${group._id}/messages`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const loadedMessages =
                response.data.messages;

            setMessages(loadedMessages);
            markMessagesAsRead(loadedMessages);

        } catch (error) {
            console.log(
                error.response?.data ||
                error.message
            );
        }
    };

    const addMembersToGroup = async () => {
        if (
            !selectedGroup ||
            selectedMembers.length === 0
        ) {
            return;
        }

        try {
            const token =
                sessionStorage.getItem("token");

            const response = await axios.put(
                `http://localhost:3030/groups/${selectedGroup._id}/members`,
                {
                    members: selectedMembers
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const updatedGroup =
                response.data.group;

            setSelectedGroup(
                updatedGroup
            );

            setGroups((previousGroups) =>
                previousGroups.map((group) =>
                    group._id ===
                    updatedGroup._id
                        ? updatedGroup
                        : group
                )
            );

            setSelectedMembers([]);
            setMemberSearch("");
            setShowAddMembers(false);

        } catch (error) {
            console.log(
                error.response?.data ||
                error.message
            );
        }
    };

    const createGroup = async () => {
        const groupName = newGroupName.trim();

        if (!groupName) {
            alert("Please enter a group name");
            return;
        }

        if (newGroupMembers.length === 0) {
            alert("Please select at least one member");
            return;
        }

        try {
            const token =
                sessionStorage.getItem("token");

            const response = await axios.post(
                "http://localhost:3030/groups",
                {
                    name: groupName,
                    members: newGroupMembers
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const currentGroupMember = profileUser || {
                _id: userId,
                username: "You"
            };
            const selectedGroupMembers = users.filter(
                (user) => newGroupMembers.includes(user._id)
            );
            const createdGroup = {
                ...response.data.group,
                members: [
                    currentGroupMember,
                    ...selectedGroupMembers
                ]
            };

            setGroups((previousGroups) => [
                ...previousGroups,
                createdGroup
            ]);
            setNewGroupName("");
            setNewGroupMembers([]);
            setShowCreateGroup(false);
            setSelectedGroup(createdGroup);
            setSelectedUser(null);
            setMessages([]);

        } catch (error) {
            console.log(
                error.response?.data ||
                error.message
            );

            alert(
                error.response?.data?.message ||
                "Group creation failed"
            );
        }
    };

    const toggleNewGroupMember = (memberId) => {
        setNewGroupMembers((previousMembers) =>
            previousMembers.includes(memberId)
                ? previousMembers.filter(
                    (id) => id !== memberId
                )
                : [...previousMembers, memberId]
        );
    };

    const toggleMemberSelection = (
        memberId
    ) => {
        setSelectedMembers(
            (previousMembers) => {
                if (
                    previousMembers.includes(
                        memberId
                    )
                ) {
                    return previousMembers.filter(
                        (id) =>
                            id !== memberId
                    );
                }

                return [
                    ...previousMembers,
                    memberId
                ];
            }
        );
    };

    const handleTyping = (e) => {
        const value =
            e.target.value;

        setMessage(value);

        if (!selectedUser) {
            return;
        }

        socket.emit(
            "typing",
            {
                senderId: userId,
                receiverId:
                    selectedUser._id,
                isTyping:
                    value.length > 0
            }
        );
    };

    const sendMessage = () => {
        if (
            !message.trim() ||
            !selectedUser
        ) {
            return;
        }

        socket.emit(
            "sendMessage",
            {
                senderId: userId,
                receiverId:
                    selectedUser._id,
                message:
                    message.trim(),
                replyTo: getReplyPayload()
            }
        );

        socket.emit(
            "typing",
            {
                senderId: userId,
                receiverId:
                    selectedUser._id,
                isTyping: false
            }
        );

        setMessage("");
        setReplyingTo(null);
        setShowEmoji(false);
    };

    const sendGroupMessage = () => {
        if (
            !message.trim() ||
            !selectedGroup
        ) {
            return;
        }

        socket.emit(
            "sendGroupMessage",
            {
                senderId: userId,
                groupId:
                    selectedGroup._id,
                message:
                    message.trim(),
                replyTo: getReplyPayload()
            }
        );

        setMessage("");
        setReplyingTo(null);
        setShowEmoji(false);
    };

    const handleSendMessage = () => {
        if (selectedGroup) {
            sendGroupMessage();
            return;
        }

        sendMessage();
    };

    const deleteForMe = (msg) => {
        socket.emit(
            "deleteMessage",
            {
                messageId: msg._id,
                senderId: userId,
                receiverId:
                    selectedUser?._id,
                groupId:
                    selectedGroup?._id,
                deleteFor: "me"
            }
        );

        setOpenMenu(null);
    };

    const copyMessage = async (msg) => {
        try {
            await navigator.clipboard.writeText(
                msg.message || msg.fileName || ""
            );
        } catch (error) {
            console.log("Copy message error:", error);
        }

        setOpenMenu(null);
    };

    const deleteForEveryone = (msg) => {
        if (
            msg.senderId?.toString() !==
            userId?.toString()
        ) {
            return;
        }

        socket.emit(
            "deleteMessage",
            {
                messageId: msg._id,
                senderId: userId,
                receiverId:
                    selectedUser?._id,
                groupId:
                    selectedGroup?._id,
                deleteFor: "everyone"
            }
        );

        setOpenMenu(null);
    };

    const addEmoji = (emoji) => {
        setMessage(
            (previousMessage) =>
                previousMessage + emoji
        );
    };

    const handleAttachment = async (e) => {
        const input = e.target;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be less than 10 MB");
            input.value = "";
            return;
        }

        try {

            const token = sessionStorage.getItem("token");
            const formData = new FormData();

            formData.append("file", file);

            const response = await axios.post(
                "http://localhost:3030/upload",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const uploadedFile = response.data.file;
            const attachmentMessage = {
                senderId: userId,
                message: uploadedFile.fileName,
                messageType: uploadedFile.messageType,
                fileName: uploadedFile.fileName,
                fileUrl: uploadedFile.fileUrl,
                fileType: uploadedFile.fileType,
                fileSize: uploadedFile.fileSize,
                replyTo: getReplyPayload()
            };

            if (selectedGroup) {
                socket.emit("sendGroupMessage", {
                    ...attachmentMessage,
                    groupId: selectedGroup._id
                });
            } else if (selectedUser) {
                socket.emit("sendMessage", {
                    ...attachmentMessage,
                    receiverId: selectedUser._id
                });
            }

            setShowAttachment(false);
            setReplyingTo(null);
            input.value = "";

        } catch (error) {

            console.log(
                "File upload error:",
                error.response?.data || error.message
            );

            alert("File upload failed");
            input.value = "";

        }
    };

    const startRecording = async () => {
        let stream;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Microphone recording is unavailable");
            }

            stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            const mimeTypes = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/mp4"
            ];
            const mimeType = mimeTypes.find((type) =>
                MediaRecorder.isTypeSupported(type)
            );
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
            const audioChunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const audioType =
                    recorder.mimeType || mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunks, {
                    type: audioType
                });

                stream.getTracks().forEach((track) => {
                    track.stop();
                });

                if (!audioBlob.size) {
                    return;
                }

                if (audioBlob.size > 10 * 1024 * 1024) {
                    alert("Voice message must be less than 10 MB");
                    return;
                }

                const extension = audioType.includes("mp4")
                    ? "mp4"
                    : "webm";
                const fileName = `voice-${Date.now()}.${extension}`;
                const formData = new FormData();

                formData.append("file", audioBlob, fileName);

                try {
                    const token = sessionStorage.getItem("token");
                    const response = await axios.post(
                        "http://localhost:3030/upload",
                        formData,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );

                    const uploadedFile = response.data.file;
                    const voiceMessage = {
                        senderId: userId,
                        message: "Voice message",
                        messageType: "audio",
                        fileName: uploadedFile.fileName,
                        fileUrl: uploadedFile.fileUrl,
                        fileType: uploadedFile.fileType,
                        fileSize: uploadedFile.fileSize,
                        replyTo: getReplyPayload()
                    };

                    if (selectedGroup) {
                        socket.emit("sendGroupMessage", {
                            ...voiceMessage,
                            groupId: selectedGroup._id
                        });
                    } else if (selectedUser) {
                        socket.emit("sendMessage", {
                            ...voiceMessage,
                            receiverId: selectedUser._id
                        });
                    }

                    setReplyingTo(null);

                } catch (error) {
                    console.log(
                        "Voice upload error:",
                        error.response?.data || error.message
                    );
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setShowAttachment(false);
            setShowEmoji(false);

        } catch (error) {
            stream?.getTracks().forEach((track) => {
                track.stop();
            });
            console.log("Microphone error:", error);
            alert("Microphone permission is required");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder?.state === "recording") {
            mediaRecorder.stop();
            setMediaRecorder(null);
            setIsRecording(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const toggleMessageSearch = () => {
        if (showMessageSearch) {
            setMessageSearch("");
        }

        setShowMessageSearch(!showMessageSearch);
    };

    const formatTime = (date) => {
        if (!date) {
            return "";
        }

        return new Date(
            date
        ).toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };

    const searchValue =
        search.trim().toLowerCase();

    const filteredUsers =
        users.filter(
            (user) =>
                user._id?.toString() !==
                userId?.toString() &&
                activeFilter !== "groups" &&
                (activeFilter !== "friends" || user.isOnline) &&
                (
                    user.username
                        ?.toLowerCase()
                        .includes(searchValue) ||
                    user.email
                        ?.toLowerCase()
                        .includes(searchValue)
                )
        );

    const filteredGroups =
        groups.filter(
            (group) =>
                (activeFilter === "all" ||
                    activeFilter === "groups") &&
                group.name
                    ?.toLowerCase()
                    .includes(searchValue)
        );

    const messageSearchValue =
        messageSearch.trim().toLowerCase();

    const filteredMessages =
        messages.filter((msg) =>
            !messageSearchValue ||
            msg.message
                ?.toLowerCase()
                .includes(messageSearchValue) ||
            msg.fileName
                ?.toLowerCase()
                .includes(messageSearchValue)
        );

    const memberSearchValue =
        memberSearch
            .trim()
            .toLowerCase();

    const availableMembers =
        selectedGroup
            ? users
                .filter(
                    (user) =>
                        !selectedGroup.members.some(
                            (member) =>
                                member._id?.toString() ===
                                user._id?.toString()
                        )
                )
                .filter(
                    (user) =>
                        user.username
                            ?.toLowerCase()
                            .includes(
                                memberSearchValue
                            ) ||
                        user.email
                            ?.toLowerCase()
                            .includes(
                                memberSearchValue
                            )
                )
            : [];

    const getSenderName = (msg) => {
        if (!selectedGroup) {
            return "";
        }

        return (
            selectedGroup.members.find(
                (member) =>
                    member._id?.toString() ===
                    msg.senderId?.toString()
            )?.username ||
            "Unknown"
        );
    };

    const getReplyPayload = () => {
        if (!replyingTo) {
            return null;
        }

        return {
            messageId: replyingTo._id,
            message: replyingTo.message,
            senderName:
                replyingTo.senderName ||
                getReplySenderName(replyingTo),
            messageType:
                replyingTo.messageType || "text"
        };
    };

    const getReplySenderName = (msg) => {
        if (msg.senderName) {
            return msg.senderName;
        }

        if (selectedGroup) {
            return getSenderName(msg);
        }

        if (
            msg.senderId?.toString() ===
            userId?.toString()
        ) {
            return profileUser?.username || "You";
        }

        return selectedUser?.username || "User";
    };

    const isOwnMessage = (msg) =>
        msg.senderId?.toString() ===
        userId?.toString();

    return (
        <div
            className="cs-app"
            data-theme={theme}
            data-chat-open={Boolean(selectedUser || selectedGroup)}
            data-info-open={showInfoPanel}
            style={{
                display: "flex",
                height: "100vh",
                width: "100%",
                fontFamily:
                    "Arial, sans-serif",
                background: "#efeae2",
                overflow: "hidden"
            }}
        >
            {messageNotification && (
    <div
        role="status"
        onClick={() => {
            const senderUser = users.find(
                (user) =>
                    user._id?.toString() ===
                    messageNotification.senderId
            );

            if (senderUser) {
                selectUser(senderUser);
            }

            setMessageNotification(null);
        }}
        style={{
            position: "fixed",
            top: "18px",
            right: "18px",
            zIndex: 3000,
            width: "min(390px, calc(100vw - 36px))",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: "13px",
            padding: "13px 14px",
            background: "rgba(255, 255, 255, 0.97)",
            border: "1px solid rgba(20, 20, 40, 0.08)",
            borderRadius: "18px",
            boxShadow:
                "0 14px 40px rgba(20, 20, 40, 0.18)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            cursor: "pointer",
            animation: "chatspaceNotificationIn 0.3s ease-out"
        }}
    >
        {/* Avatar */}
        <div
            style={{
                width: "46px",
                height: "46px",
                minWidth: "46px",
                borderRadius: "15px",
                background:
                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "17px",
                overflow: "hidden"
            }}
        >
            {(() => {
                const senderUser = users.find(
                    (user) =>
                        user._id?.toString() ===
                        messageNotification.senderId
                );

                if (senderUser?.profilePhoto) {
                    return (
                        <img
                            src={`http://localhost:3030${senderUser.profilePhoto}`}
                            alt=""
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                            }}
                        />
                    );
                }

                return (
                    messageNotification.senderName
                        ?.charAt(0)
                        ?.toUpperCase() || "C"
                );
            })()}
        </div>

        {/* Notification content */}
        <div
            style={{
                flex: 1,
                minWidth: 0
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px"
                }}
            >
                <strong
                    style={{
                        fontSize: "14px",
                        color: "#171725",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}
                >
                    {messageNotification.senderName}
                </strong>

                <span
                    style={{
                        fontSize: "11px",
                        color: "#9292a3",
                        whiteSpace: "nowrap"
                    }}
                >
                    Now
                </span>
            </div>

            <div
                style={{
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#686879",
                    fontSize: "13px",
                    overflow: "hidden"
                }}
            >
                <span
                    style={{
                        width: "7px",
                        height: "7px",
                        minWidth: "7px",
                        borderRadius: "50%",
                        background: "#6366f1"
                    }}
                />

                <span
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}
                >
                    {messageNotification.message}
                </span>
            </div>
        </div>

        {/* Close */}
        <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(event) => {
                event.stopPropagation();
                setMessageNotification(null);
            }}
            style={{
                width: "28px",
                height: "28px",
                minWidth: "28px",
                border: "none",
                borderRadius: "50%",
                background: "#f2f2f6",
                color: "#777787",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
            }}
        >
            <X size={15} />
        </button>
    </div>
)}

            <CallOverlay
                callState={callState}
                incomingCall={incomingCall}
                localStream={localStream}
                remoteStream={remoteStream}
                callError={callError}
                onAccept={acceptCall}
                onReject={rejectCall}
                onEnd={() => closeCall(true)}
            />

            <div
                className="cs-sidebar"
                style={{
                    width: "340px",
                    minWidth: "340px",
                    background: "#ffffff",
                    borderRight:
                        "1px solid #d1d7db",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <div
                    className="cs-sidebar-top"
                    style={{
                        padding: "16px",
                        background: "#f0f2f5",
                        borderBottom:
                            "1px solid #d1d7db"
                    }}
                >
                    <div
                        className="cs-sidebar-account-row"
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center"
                        }}
                    >
                        <div className="cs-brand-lockup">
                            <div className="cs-brand-mark">CS</div>
                            <div className="cs-brand-copy">
                                <strong>ChatSpace</strong>
                                <small>Real-Time Communication Platform</small>
                            </div>
                        </div>

                        <div className="cs-profile-menu-wrap">
                            <button
                                type="button"
                                className="cs-account-trigger"
                                aria-label="Open account menu"
                                aria-expanded={showProfileMenu}
                                onClick={() =>
                                    setShowProfileMenu((previous) => !previous)
                                }
                            >
                                {profileUser?.profilePhoto ? (
                                    <img
                                        src={`http://localhost:3030${profileUser.profilePhoto}`}
                                        alt=""
                                    />
                                ) : (
                                    <UserRound size={18} />
                                )}
                            </button>

                            {showProfileMenu && (
                                <div className="cs-account-menu">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate("/profile");
                                        }}
                                    >
                                        <UserRound size={16} /> Profile
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate("/settings");
                                        }}
                                    >
                                        <Settings size={16} /> Settings
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (callState) {
                                                closeCall(true);
                                            }
                                            sessionStorage.removeItem("token");
                                            socket.disconnect();
                                            navigate("/");
                                        }}
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className="cs-search-wrap"
                        style={{
                            marginTop:
                                "14px",
                            position:
                                "relative"
                        }}
                    >
                        <Search size={17} aria-hidden="true" />

                        <input
                            aria-label="Search conversations, people, and groups"
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                            placeholder="Search conversations, people, groups..."
                            className="cs-chat-search"
                            style={{
                                width: "100%",
                                boxSizing:
                                    "border-box",
                                padding:
                                    "11px 15px 11px 40px",
                                border: "none",
                                borderRadius:
                                    "8px",
                                background:
                                    "#ffffff",
                                outline:
                                    "none"
                            }}
                        />

                        {search && (
                            <button
                                type="button"
                                className="cs-search-clear"
                                aria-label="Clear search"
                                onClick={() => setSearch("")}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <nav className="cs-filter-tabs" aria-label="Conversation filters">
                        {[
                            ["all", "All"],
                            ["chats", "Chats"],
                            ["groups", "Groups"],
                            ["friends", "Friends"]
                        ].map(([filter, label]) => (
                            <button
                                key={filter}
                                type="button"
                                aria-pressed={activeFilter === filter}
                                onClick={() => setActiveFilter(filter)}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div
                    className="cs-sidebar-scroll"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding:
                            "8px 0"
                    }}
                >
                    <div
                        className="cs-section-label"
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding:
                                "10px 16px 6px",
                            color:
                                "#667781",
                            fontSize:
                                "13px",
                            fontWeight:
                                "bold"
                        }}
                    >
                        <span>GROUPS</span>
                        <button
                            type="button"
                            aria-label="Create group"
                            title="Create group"
                            onClick={() => {
                                setNewGroupName("");
                                setNewGroupMembers([]);
                                setShowCreateGroup(true);
                            }}
                            style={{
                                border: "none",
                                background: "transparent",
                                color: "#128c7e",
                                fontSize: "24px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                lineHeight: "20px"
                            }}
                        >
                            +
                        </button>
                    </div>

                    {filteredGroups.map(
                        (group) => (
                            <div
                                key={
                                    group._id
                                }
                                className="cs-conversation-item"
                                data-active={selectedGroup?._id === group._id}
                                onClick={() =>
                                    selectGroup(
                                        group
                                    )
                                }
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: "12px",
                                    padding:
                                        "12px 16px",
                                    cursor:
                                        "pointer",
                                    background:
                                        selectedGroup?._id ===
                                        group._id
                                            ? "#f0f2f5"
                                            : "#ffffff"
                                }}
                            >
                                <div
                                    style={{
                                        width:
                                            "48px",
                                        height:
                                            "48px",
                                        borderRadius:
                                            "50%",
                                        background:
                                            "#dfe5e7",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center",
                                        fontSize:
                                            "22px"
                                    }}
                                >
                                    👥
                                </div>

                                <div
                                    style={{
                                        flex: 1,
                                        minWidth:
                                            0
                                    }}
                                >
                                    <strong
                                        style={{
                                            display:
                                                "block",
                                            overflow:
                                                "hidden",
                                            textOverflow:
                                                "ellipsis",
                                            whiteSpace:
                                                "nowrap"
                                        }}
                                    >
                                        {group.name}
                                    </strong>

                                    <small
                                        style={{
                                            color:
                                                "#667781"
                                        }}
                                    >
                                        {
                                            group
                                                .members
                                                .length
                                        }{" "}
                                        members
                                    </small>
                                </div>
                            </div>
                        )
                    )}

                    <div
                        className="cs-section-label"
                        style={{
                            padding:
                                "15px 16px 6px",
                            color:
                                "#667781",
                            fontSize:
                                "13px",
                            fontWeight:
                                "bold"
                        }}
                    >
                        CHATS
                    </div>

                    {filteredUsers.map(
                        (user) => (
                            <div
                                key={
                                    user._id
                                }
                                className="cs-conversation-item"
                                data-active={selectedUser?._id === user._id}
                                onClick={() =>
                                    selectUser(
                                        user
                                    )
                                }
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: "12px",
                                    padding:
                                        "12px 16px",
                                    cursor:
                                        "pointer",
                                    background:
                                        selectedUser?._id ===
                                        user._id
                                            ? "#f0f2f5"
                                            : "#ffffff"
                                }}
                            >
                                <div
                                    style={{
                                        width:
                                            "48px",
                                        height:
                                            "48px",
                                        borderRadius:
                                            "50%",
                                        background:
                                            "#dfe5e7",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center",
                                        fontSize:
                                            "21px",
                                        position:
                                            "relative"
                                    }}
                                >
                                {user.profilePhoto ? (
                                    <img
                                        src={`http://localhost:3030${user.profilePhoto}`}
                                        alt={user.username}
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "50%",
                                            objectFit: "cover"
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "50%",
                                            background: "#dfe5e7",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "21px",
                                            position: "relative"
                                        }}
                                    >
                                        👤
                                    </div>
                                )}

                                {user.isOnline && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                right: "0",
                                                bottom: "1px",
                                                width: "12px",
                                                height: "12px",
                                                background: "#25d366",
                                                border: "2px solid #ffffff",
                                                borderRadius: "50%"
                                            }}
                                        />
                                    )}
                                </div>

                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0
                                    }}
                                >
                                    <strong>{user.username}</strong>

                                    <div
                                        style={{
                                            marginTop: "4px",
                                            fontSize: "12px",
                                            color: lastMessages[user._id]
                                                ? "#667781"
                                                : user.isOnline
                                                    ? "#25a244"
                                                    : "#667781",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        {lastMessages[user._id] ||
                                            (user.isOnline ? "Online" : "Offline")}
                                    </div>
                                </div>

                                {unreadCounts[user._id] > 0 && (
                                    <span
                                        style={{
                                            background: "#25d366",
                                            color: "#ffffff",
                                            borderRadius: "50%",
                                            minWidth: "20px",
                                            height: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "11px",
                                            fontWeight: "bold",
                                            padding: "0 3px",
                                            boxSizing: "border-box"
                                        }}
                                    >
                                        {unreadCounts[user._id]}
                                    </span>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            <div
                className="cs-main"
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection:
                        "column",
                    minWidth: 0
                }}
            >
                <div
                    className="cs-chat-header"
                    style={{
                        minHeight:
                            "72px",
                        padding:
                            "12px 20px",
                        background:
                            "#f0f2f5",
                        borderBottom:
                            "1px solid #d1d7db",
                        display:
                            "flex",
                        alignItems:
                            "center"
                    }}
                >
                    {selectedGroup ? (
                        <div
                            className="cs-header-content"
                            style={{
                                width:
                                    "100%",
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "space-between"
                            }}
                        >
                            <button
                                type="button"
                                className="cs-mobile-back"
                                aria-label="Back to conversations"
                                onClick={() => {
                                    setSelectedGroup(null);
                                    setMessages([]);
                                }}
                            >
                                <ArrowLeft size={19} />
                            </button>

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "12px"
                                }}
                            >
                                <div
                                    style={{
                                        width:
                                            "48px",
                                        height:
                                            "48px",
                                        borderRadius:
                                            "50%",
                                        background:
                                            "#dfe5e7",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center",
                                        fontSize:
                                            "22px"
                                    }}
                                >
                                    👥
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <strong>
                                        {selectedGroup.name}
                                    </strong>

                                    <div
                                        style={{
                                            marginTop:
                                                "4px",
                                            color:
                                                "#667781",
                                            fontSize:
                                                "13px"
                                        }}
                                    >
                                        {
                                            selectedGroup
                                                .members
                                                .length
                                        }{" "}
                                        members
                                    </div>
                                </div>
                            </div>

                            {selectedGroup.admin?.toString() ===
                                userId?.toString() && (
                                <button
                                    onClick={() => {
                                        setSelectedMembers(
                                            []
                                        );
                                        setMemberSearch(
                                            ""
                                        );
                                        setShowAddMembers(
                                            true
                                        );
                                    }}
                                    style={{
                                        border:
                                            "none",
                                        background:
                                            "#25d366",
                                        color:
                                            "#ffffff",
                                        padding:
                                            "10px 15px",
                                        borderRadius:
                                            "20px",
                                        cursor:
                                            "pointer",
                                        fontWeight:
                                            "bold"
                                    }}
                                >
                                    + Add members
                                </button>
                            )}

                            <div className="cs-chat-actions">
                                <button
                                    type="button"
                                    aria-label="Search messages"
                                    title="Search messages"
                                    onClick={toggleMessageSearch}
                                >
                                    <Search size={18} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Group information"
                                    title="Group information"
                                    onClick={() => setShowInfoPanel(true)}
                                >
                                    <Info size={18} />
                                </button>
                            </div>
                        </div>
                    ) : selectedUser ? (
                        <div
                            className="cs-header-content"
                            style={{
                                width: "100%",
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "space-between",
                                gap:
                                    "12px"
                            }}
                        >
                            <button
                                type="button"
                                className="cs-mobile-back"
                                aria-label="Back to conversations"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setMessages([]);
                                }}
                            >
                                <ArrowLeft size={19} />
                            </button>

                           <button
    type="button"
    onClick={() => setShowInfoPanel(true)}
    style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "0",
        textAlign: "left"
    }}
>
    {selectedUser.profilePhoto ? (
        <img
            src={`http://localhost:3030${selectedUser.profilePhoto}`}
            alt={selectedUser.username}
            style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                objectFit: "cover"
            }}
        />
    ) : (
        <div
            style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#dfe5e7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "21px"
            }}
        >
            👤
        </div>
    )}

    <div>
        <strong>
            {selectedUser.username}
        </strong>

        <div
            style={{
                marginTop: "4px",
                color:
                    isTyping
                        ? "#111827"
                        : selectedUser.isOnline
                            ? "#25a244"
                            : "#667781",
                fontSize: "13px"
            }}
        >
            {isTyping
                ? "typing..."
                : selectedUser.isOnline
                    ? "online"
                    : "offline"}
        </div>
    </div>
</button>

                            <div className="cs-chat-actions">
                                <button
                                    type="button"
                                    aria-label="Search messages"
                                    title="Search messages"
                                    onClick={toggleMessageSearch}
                                >
                                    <Search size={18} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Start voice call"
                                    title="Voice call"
                                    onClick={() => startCall("audio")}
                                    disabled={Boolean(callState || incomingCall)}
                                >
                                    <Phone size={18} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Start video call"
                                    title="Video call"
                                    onClick={() => startCall("video")}
                                    disabled={Boolean(callState || incomingCall)}
                                >
                                    <Video size={18} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Chat information"
                                    title="Chat information"
                                    onClick={() => setShowInfoPanel(true)}
                                >
                                    <Info size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <strong>
                                Real-Time Chat
                            </strong>

                            <div
                                style={{
                                    fontSize:
                                        "13px",
                                    color:
                                        "#667781",
                                    marginTop:
                                        "4px"
                                }}
                            >
                                Select a chat to start messaging
                            </div>
                        </div>
                    )}
                </div>

                {showMessageSearch && (
                    <div
                        style={{
                            background: "#f0f2f5",
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={messageSearch}
                            onChange={(event) =>
                                setMessageSearch(event.target.value)
                            }
                            autoFocus
                            style={{
                                flex: 1,
                                border: "none",
                                outline: "none",
                                background: "#ffffff",
                                borderRadius: "20px",
                                padding: "9px 14px",
                                fontSize: "14px",
                                color: "#111111"
                            }}
                        />

                        <button
                            type="button"
                            aria-label="Close message search"
                            onClick={() => {
                                setMessageSearch("");
                                setShowMessageSearch(false);
                            }}
                            style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "20px",
                                color: "#54656f"
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {selectedGroup && (
                    <details
                        style={{
                            background:
                                "#ffffff",
                            borderBottom:
                                "1px solid #ddd",
                            padding:
                                "8px 20px"
                        }}
                    >
                        <summary
                            style={{
                                cursor:
                                    "pointer",
                                color:
                                    "#128c7e",
                                fontWeight:
                                    "600"
                            }}
                        >
                            View group members
                        </summary>

                        <div
                            style={{
                                marginTop:
                                    "8px",
                                display:
                                    "flex",
                                gap:
                                    "8px",
                                flexWrap:
                                    "wrap"
                            }}
                        >
                            {selectedGroup.members.map(
                                (member) => (
                                    <span
                                        key={
                                            member._id
                                        }
                                        style={{
                                            padding:
                                                "7px 10px",
                                            borderRadius:
                                                "15px",
                                            background:
                                                "#f0f2f5",
                                            fontSize:
                                                "13px"
                                        }}
                                    >
                                        {member.username}

                                        {member._id?.toString() ===
                                            selectedGroup.admin?.toString()
                                            ? " 👑"
                                            : ""}
                                    </span>
                                )
                            )}
                        </div>
                    </details>
                )}

                <div
                    className="cs-message-list"
                    onClick={() => {
                        setOpenMenu(null);
                        setShowEmoji(false);
                        setShowAttachment(false);
                    }}
                    style={{
                        flex: 1,
                        overflowY:
                            "auto",
                        padding:
                            "24px",
                        background:
                            "#efeae2",
                        backgroundImage:
                            "radial-gradient(#d8d1c8 1px, transparent 1px)",
                        backgroundSize:
                            "18px 18px"
                    }}
                >
                    {!selectedUser &&
                    !selectedGroup ? (
                        <div
                            style={{
                                height:
                                    "100%",
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "center",
                                textAlign:
                                    "center"
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize:
                                            "60px"
                                    }}
                                >
                                    💬
                                </div>

                                <h2>
                                    Welcome to Real-Time Chat
                                </h2>

                                <p
                                    style={{
                                        color:
                                            "#667781"
                                    }}
                                >
                                    Select a person or group
                                    to start chatting
                                </p>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div
                            style={{
                                textAlign:
                                    "center",
                                marginTop:
                                    "30px",
                                color:
                                    "#667781"
                            }}
                        >
                            <div
                                style={{
                                    background:
                                        "#fff3c4",
                                    display:
                                        "inline-block",
                                    padding:
                                        "8px 14px",
                                    borderRadius:
                                        "8px",
                                    fontSize:
                                        "13px"
                                }}
                            >
                                🔒 Messages are private and
                                protected
                            </div>

                            <p>
                                No messages yet.
                                Start chatting!
                            </p>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <p
                            style={{
                                textAlign: "center",
                                color: "#667781"
                            }}
                        >
                            No matching messages.
                        </p>
                    ) : (
                        filteredMessages.map(
                            (msg) => {
                                const own =
                                    isOwnMessage(
                                        msg
                                    );

                                return (
                                    <div
                                        className="cs-message-row"
                                        data-own={own}
                                        key={
                                            msg._id
                                        }
                                        style={{
                                            marginBottom:
                                                "8px",
                                            display:
                                                "flex",
                                            justifyContent:
                                                own
                                                    ? "flex-end"
                                                    : "flex-start"
                                        }}
                                    >
                                        <div
                                            className="cs-message-bubble"
                                            data-own={own}
                                            style={{
                                                maxWidth:
                                                    "65%",
                                                minWidth:
                                                    "80px",
                                                position:
                                                    "relative"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding:
                                                        "8px 10px 6px",
                                                    borderRadius:
                                                        own
                                                            ? "8px 0 8px 8px"
                                                            : "0 8px 8px 8px",
                                                    background:
                                                        own
                                                            ? "#d9fdd3"
                                                            : "#ffffff",
                                                    boxShadow:
                                                        "0 1px 2px rgba(0,0,0,0.15)"
                                                }}
                                            >
                                                    {msg.replyTo?.messageId && (
                                                        <div
                                                            style={{
                                                                borderLeft: "3px solid #00a884",
                                                                background: "rgba(0,0,0,0.04)",
                                                                borderRadius: "4px",
                                                                padding: "5px 8px",
                                                                marginBottom: "7px",
                                                                minWidth: 0
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    color: "#008069",
                                                                    fontWeight: "bold",
                                                                    fontSize: "12px"
                                                                }}
                                                            >
                                                                {msg.replyTo.senderName || "User"}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    color: "#344054",
                                                                    fontSize: "12px",
                                                                    whiteSpace: "nowrap",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis"
                                                                }}
                                                            >
                                                                {msg.replyTo.messageType === "image"
                                                                    ? "Photo"
                                                                    : msg.replyTo.messageType === "file"
                                                                        ? `File: ${msg.replyTo.message || "Attachment"}`
                                                                        : msg.replyTo.message}
                                                            </div>
                                                        </div>
                                                    )}

                                                {selectedGroup &&
                                                    !own && (
                                                        <div
                                                            style={{
                                                                color:
                                                                    "#128c7e",
                                                                fontWeight:
                                                                    "bold",
                                                                fontSize:
                                                                    "13px",
                                                                marginBottom:
                                                                    "3px"
                                                            }}
                                                        >
                                                            {getSenderName(
                                                                msg
                                                            )}
                                                        </div>
                                                    )}

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "flex-start",
                                                        gap:
                                                            "8px"
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            flex:
                                                                1,
                                                            wordBreak:
                                                                "break-word",
                                                            lineHeight:
                                                                "1.4"
                                                        }}
                                                    >
                                                            {msg.messageType === "audio" && msg.fileUrl ? (
                                                                <audio
                                                                    controls
                                                                    preload="metadata"
                                                                    src={`http://localhost:3030${msg.fileUrl}`}
                                                                    style={{
                                                                        width: "240px",
                                                                        maxWidth: "100%"
                                                                    }}
                                                                />
                                                            ) : msg.messageType === "image" && msg.fileUrl ? (
                                                                <div>
                                                                    <img
                                                                        src={`http://localhost:3030${msg.fileUrl}`}
                                                                        alt={msg.fileName || "Image"}
                                                                        style={{
                                                                            width: "220px",
                                                                            maxWidth: "100%",
                                                                            borderRadius: "8px",
                                                                            display: "block",
                                                                            cursor: "pointer"
                                                                        }}
                                                                        onClick={() =>
                                                                            window.open(
                                                                                `http://localhost:3030${msg.fileUrl}`,
                                                                                "_blank",
                                                                                "noopener,noreferrer"
                                                                            )
                                                                        }
                                                                    />

                                                                    <div
                                                                        style={{
                                                                            fontSize: "12px",
                                                                            marginTop: "5px",
                                                                            wordBreak: "break-word"
                                                                        }}
                                                                    >
                                                                        {msg.fileName}
                                                                    </div>
                                                                </div>
                                                            ) : msg.messageType === "file" && msg.fileUrl ? (
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "10px",
                                                                        minWidth: "200px"
                                                                    }}
                                                                >
                                                                    <div style={{ fontSize: "32px" }}>
                                                                        📄
                                                                    </div>

                                                                    <div
                                                                        style={{
                                                                            flex: 1,
                                                                            minWidth: 0
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                fontWeight: "600",
                                                                                wordBreak: "break-word"
                                                                            }}
                                                                        >
                                                                            {msg.fileName}
                                                                        </div>

                                                                        <div
                                                                            style={{
                                                                                fontSize: "12px",
                                                                                opacity: 0.7,
                                                                                marginTop: "3px"
                                                                            }}
                                                                        >
                                                                            {msg.fileSize
                                                                                ? `${(
                                                                                    msg.fileSize /
                                                                                    1024 /
                                                                                    1024
                                                                                ).toFixed(2)} MB`
                                                                                : ""}
                                                                        </div>

                                                                        <a
                                                                            href={`http://localhost:3030${msg.fileUrl}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            style={{
                                                                                display: "inline-block",
                                                                                marginTop: "5px"
                                                                            }}
                                                                        >
                                                                            Open / Download
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                msg.message
                                                            )}
                                                    </div>

                                                    <button
                                                        onClick={(
                                                            e
                                                        ) => {
                                                            e.stopPropagation();

                                                            setOpenMenu(
                                                                openMenu ===
                                                                    msg._id
                                                                    ? null
                                                                    : msg._id
                                                            );
                                                        }}
                                                        style={{
                                                            border:
                                                                "none",
                                                            background:
                                                                "transparent",
                                                            cursor:
                                                                "pointer",
                                                            fontSize:
                                                                "17px",
                                                            color:
                                                                "#667781",
                                                            padding:
                                                                "0",
                                                            lineHeight:
                                                                "15px"
                                                        }}
                                                    >
                                                        ⋮
                                                    </button>
                                                </div>

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        justifyContent:
                                                            "flex-end",
                                                        alignItems:
                                                            "center",
                                                        gap:
                                                            "4px",
                                                        marginTop:
                                                            "2px"
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color:
                                                                "#667781",
                                                            fontSize:
                                                                "10px"
                                                        }}
                                                    >
                                                        {formatTime(
                                                            msg.createdAt
                                                        )}
                                                    </span>

                                                    {msg.starredBy?.some(
                                                        (id) =>
                                                            id?.toString() ===
                                                            userId?.toString()
                                                    ) && (
                                                        <span
                                                            style={{
                                                                marginLeft: "6px",
                                                                fontSize: "12px"
                                                            }}
                                                        >
                                                            ⭐
                                                        </span>
                                                    )}

                                                    {own && (
                                                        <span
                                                            style={{
                                                                color:
                                                                    msg.readBy?.length
                                                                        ? "#53bdeb"
                                                                        : "#667781",
                                                                fontSize:
                                                                    "13px",
                                                                fontWeight:
                                                                    "bold"
                                                            }}
                                                        >
                                                            {msg.deliveredTo?.length
                                                                ? "✓✓"
                                                                : "✓"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {openMenu ===
                                                msg._id && (
                                                <div
                                                    onClick={(
                                                        e
                                                    ) =>
                                                        e.stopPropagation()
                                                    }
                                                    style={{
                                                        position:
                                                            "absolute",
                                                        right: "0",
                                                        top:
                                                            "30px",
                                                        width:
                                                            "180px",
                                                        background:
                                                            "#ffffff",
                                                        borderRadius:
                                                            "8px",
                                                        boxShadow:
                                                            "0 4px 12px rgba(0, 0, 0, 0.18)",
                                                        padding:
                                                            "6px 0",
                                                        overflow:
                                                            "hidden",
                                                        zIndex:
                                                            1000
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setReplyingTo({
                                                                ...msg,
                                                                senderName:
                                                                    getReplySenderName(msg)
                                                            });
                                                            setOpenMenu(null);
                                                        }}
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            padding: "11px 16px",
                                                            border: "none",
                                                            background: "#ffffff",
                                                            cursor: "pointer",
                                                            textAlign: "left",
                                                            color: "#111111",
                                                            fontSize: "14px",
                                                            fontWeight: "500"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#f0f2f5";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#ffffff";
                                                        }}
                                                    >
                                                        Reply
                                                    </button>

                                                    <button
                                                        onClick={() => copyMessage(msg)}
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            padding: "11px 16px",
                                                            border: "none",
                                                            background: "#ffffff",
                                                            cursor: "pointer",
                                                            textAlign: "left",
                                                            color: "#111111",
                                                            fontSize: "14px",
                                                            fontWeight: "500"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#f0f2f5";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#ffffff";
                                                        }}
                                                    >
                                                        Copy
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            socket.emit(
                                                                "starMessage",
                                                                {
                                                                    messageId: msg._id,
                                                                    userId: userId
                                                                }
                                                            );
                                                            setOpenMenu(null);
                                                        }}
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            padding: "11px 16px",
                                                            border: "none",
                                                            background: "#ffffff",
                                                            cursor: "pointer",
                                                            textAlign: "left",
                                                            color: "#111111",
                                                            fontSize: "14px",
                                                            fontWeight: "500"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#f0f2f5";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#ffffff";
                                                        }}
                                                    >
                                                        {msg.starredBy?.some(
                                                            (id) =>
                                                                id?.toString() ===
                                                                userId?.toString()
                                                        )
                                                            ? "Unstar"
                                                            : "Star"}
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            deleteForMe(
                                                                msg
                                                            )
                                                        }
                                                        style={{
                                                            display: "block",
                                                            width:
                                                                "100%",
                                                            padding:
                                                                "11px 16px",
                                                            border:
                                                                "none",
                                                            background:
                                                                "#ffffff",
                                                            cursor:
                                                                "pointer",
                                                            textAlign:
                                                                "left",
                                                            color:
                                                                "#d32f2f",
                                                            fontSize: "14px",
                                                            fontWeight: "500"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#f0f2f5";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#ffffff";
                                                        }}
                                                    >
                                                        Delete for me
                                                    </button>

                                                    {own && (
                                                        <button
                                                            onClick={() =>
                                                                deleteForEveryone(
                                                                    msg
                                                                )
                                                            }
                                                            style={{
                                                                display: "block",
                                                                width:
                                                                    "100%",
                                                                padding:
                                                                    "11px 16px",
                                                                border:
                                                                    "none",
                                                                background:
                                                                    "#ffffff",
                                                                cursor:
                                                                    "pointer",
                                                                textAlign:
                                                                    "left",
                                                                color:
                                                                    "#d32f2f",
                                                                fontSize: "14px",
                                                                fontWeight: "500"
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = "#f0f2f5";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = "#ffffff";
                                                            }}
                                                        >
                                                            Delete for everyone
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        )
                    )}

                    <div
                        ref={
                            messageEndRef
                        }
                    />
                </div>

                {(selectedUser ||
                    selectedGroup) && (
                    <div
                        className="cs-composer"
                        style={{
                            position:
                                "relative",
                            padding:
                                "10px 14px",
                            background:
                                "#f0f2f5",
                            borderTop:
                                "1px solid #d1d7db"
                        }}
                    >
                        {replyingTo && (
                            <div
                                style={{
                                    background: "#d9fdd3",
                                    padding: "8px 12px",
                                    borderLeft: "4px solid #00a884",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    marginBottom: "10px"
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0
                                    }}
                                >
                                    <div
                                        style={{
                                            color: "#008069",
                                            fontWeight: "bold",
                                            fontSize: "13px",
                                            marginBottom: "3px"
                                        }}
                                    >
                                        Replying to {replyingTo.senderName || "User"}
                                    </div>

                                    <div
                                        style={{
                                            color: "#111111",
                                            fontSize: "14px",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis"
                                        }}
                                    >
                                        {replyingTo.messageType === "image"
                                            ? "📷 Photo"
                                            : replyingTo.messageType === "file"
                                                ? `📄 ${replyingTo.fileName || "File"}`
                                                : replyingTo.message}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    aria-label="Cancel reply"
                                    onClick={() => setReplyingTo(null)}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#111111",
                                        fontSize: "22px",
                                        cursor: "pointer",
                                        padding: "2px 6px",
                                        flex: "0 0 auto"
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {showEmoji && (
                            <div
                                style={{
                                    position:
                                        "absolute",
                                    bottom:
                                        "65px",
                                    left:
                                        "10px",
                                    background:
                                        "#ffffff",
                                    borderRadius:
                                        "12px",
                                    padding:
                                        "12px",
                                    boxShadow:
                                        "0 4px 20px rgba(0,0,0,0.2)",
                                    width:
                                        "280px",
                                    zIndex:
                                        100
                                }}
                            >
                                <div
                                    style={{
                                        display:
                                            "grid",
                                        gridTemplateColumns:
                                            "repeat(6, 1fr)",
                                        gap:
                                            "8px"
                                    }}
                                >
                                    {emojis.map(
                                        (
                                            emoji,
                                            index
                                        ) => (
                                            <button
                                                key={
                                                    index
                                                }
                                                onClick={() =>
                                                    addEmoji(
                                                        emoji
                                                    )
                                                }
                                                style={{
                                                    border:
                                                        "none",
                                                    background:
                                                        "transparent",
                                                    cursor:
                                                        "pointer",
                                                    fontSize:
                                                        "24px",
                                                    padding:
                                                        "5px"
                                                }}
                                            >
                                                {
                                                    emoji
                                                }
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {showAttachment && (
                            <div
                                style={{
                                    position:
                                        "absolute",
                                    bottom:
                                        "65px",
                                    left:
                                        "55px",
                                    background:
                                        "#ffffff",
                                    borderRadius:
                                        "12px",
                                    padding:
                                        "10px",
                                    boxShadow:
                                        "0 4px 20px rgba(0,0,0,0.2)",
                                    zIndex:
                                        100,
                                    minWidth:
                                        "190px"
                                }}
                            >
                                <label
                                    style={{
                                        display:
                                            "block",
                                        padding:
                                            "10px",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    🖼️ Photos & videos
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={
                                            handleAttachment
                                        }
                                        style={{
                                            display:
                                                "none"
                                        }}
                                    />
                                </label>

                                <label
                                    style={{
                                        display:
                                            "block",
                                        padding:
                                            "10px",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    📄 Document
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx"
                                        onChange={
                                            handleAttachment
                                        }
                                        style={{
                                            display:
                                                "none"
                                        }}
                                    />
                                </label>

                                <label
                                    style={{
                                        display:
                                            "block",
                                        padding:
                                            "10px",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    📎 Any file
                                    <input
                                        type="file"
                                        onChange={
                                            handleAttachment
                                        }
                                        style={{
                                            display:
                                                "non+e"
                                        }}
                                    />
                                </label>
                            </div>
                        )}

                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                gap:
                                    "8px"
                            }}
                        >
                            <button
                                onClick={() => {
                                    setShowEmoji(
                                        !showEmoji
                                    );
                                    setShowAttachment(
                                        false
                                    );
                                }}
                                style={{
                                    border:
                                        "none",
                                    background:
                                        "transparent",
                                    cursor:
                                        "pointer",
                                    fontSize:
                                        "25px",
                                    padding:
                                        "5px"
                                }}
                            >
                                😊
                            </button>
                                 <Smile size={20} />

                            <button
                                onClick={() => {
                                    setShowAttachment(
                                        !showAttachment
                                    );
                                    setShowEmoji(
                                        false
                                    );
                                }}
                                style={{
                                    border:
                                        "none",
                                    background:
                                        "transparent",
                                    cursor:
                                        "pointer",
                                    fontSize:
                                        "23px",
                                    padding:
                                        "5px"
                                }}
                            >
                                📎
                            </button>

                            <input
                                type="text"
                                placeholder="Type a message"
                                value={message}
                                onChange={
                                    handleTyping
                                }
                                onKeyDown={
                                    handleKeyDown
                                }
                                onFocus={() => {
                                    setOpenMenu(
                                        null
                                    );
                                }}
                                style={{
                                    flex:
                                        1,
                                    border:
                                        "none",
                                    outline:
                                        "none",
                                    background:
                                        "#ffffff",
                                    borderRadius:
                                        "22px",
                                    padding:
                                        "12px 16px",
                                    fontSize:
                                        "15px",
                                    color:
                                        "#111111"
                                }}
                            />

                            <button
                                type="button"
                                aria-label={
                                    isRecording
                                        ? "Stop recording"
                                        : "Record voice message"
                                }
                                title={
                                    isRecording
                                        ? "Stop recording"
                                        : "Record voice message"
                                }
                                onClick={
                                    isRecording
                                        ? stopRecording
                                        : startRecording
                                }
                                style={{
                                    border: "none",
                                    background: isRecording
                                        ? "#ff4d4f"
                                        : "transparent",
                                    color: isRecording
                                        ? "#ffffff"
                                        : "#54656f",
                                    fontSize: "21px",
                                    cursor: "pointer",
                                    borderRadius: "50%",
                                    width: "40px",
                                    height: "40px",
                                    flex: "0 0 40px"
                                }}
                            >
                                
                                 <Mic size={22} />
                            </button>

                            <button
                                onClick={
                                    handleSendMessage
                                }
                                style={{
                                    width:
                                        "44px",
                                    height:
                                        "44px",
                                    borderRadius:
                                        "50%",
                                    border:
                                        "none",
                                    background:
                                        "#128c7e",
                                    color:
                                        "#ffffff",
                                    cursor:
                                        "pointer",
                                    fontSize:
                                        "18px"
                                }}
                            >
                                
                            </button>
                                 <Send size={18} />
                        </div>
                    </div>
                )}
            </div>

            <aside
    className="cs-info-panel"
    aria-label="Chat information"
>
    {/* Chat Info Header */}
    <div className="cs-info-heading">
        <div>
            <strong>Chat Info</strong>

            <small>
    {selectedGroup
        ? "Group conversation"
        : selectedUser
            ? "Chat details"
            : "Conversation details"}
</small>
        </div>

        <button
            type="button"
            className="cs-icon-button"
            aria-label="Close chat information"
            title="Close"
            onClick={() => {
                console.log("Closing Chat Info");
                setShowInfoPanel(false);
            }}
        >
            <X size={17} />
        </button>
    </div>

   {/* Profile / Group Information */}
{selectedGroup ? (
    <>
        <div className="cs-info-profile">
            <div className="cs-info-avatar is-group">
                <UsersRound size={28} />
            </div>

            <strong>{selectedGroup.name}</strong>

            <span>
                {selectedGroup.members.length} members
            </span>
        </div>

        <section className="cs-info-section">
            <h3>Group members</h3>

            {selectedGroup.members.map((member) => (
                <div
                    className="cs-info-member"
                    key={member._id}
                >
                    <span className="cs-mini-avatar">
                        <UserRound size={15} />
                    </span>

                    <span>{member.username}</span>

                    {member._id?.toString() ===
                        selectedGroup.admin?.toString() && (
                        <span className="cs-admin-badge">
                            Admin
                        </span>
                    )}
                </div>
            ))}
        </section>
    </>
) : selectedUser ? (
    <>
        <div className="cs-info-profile">

            <div style={{ position: "relative", display: "inline-block" }}>
                {selectedUser.profilePhoto ? (
                    <img
                        className="cs-info-avatar"
                        src={`http://localhost:3030${selectedUser.profilePhoto}`}
                        alt={selectedUser.username}
                        onClick={handlePhotoClick}
                        style={{ cursor: "pointer", borderRadius: "50%", objectFit: "cover" }}
                    />
                ) : (
                    <div
                        className="cs-info-avatar"
                        onClick={handlePhotoClick}
                        style={{ cursor: "pointer" }}
                    >
                        <UserRound size={34} />
                    </div>
                )}

                {(uploadingPhoto || removingPhoto) && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 500
                        }}
                    >
                        <Loader size={20} className="cs-spin" />
                        <span style={{ marginLeft: "6px" }}>
                            {uploadingPhoto ? "Uploading..." : "Removing..."}
                        </span>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                />
            </div>

            {showPhotoMenu && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginTop: "8px",
                        zIndex: 1000,
                        background: "#ffffff",
                        border: "1px solid #d1d7db",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "180px",
                        overflow: "hidden"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {selectedUser.profilePhoto && (
                        <button
                            type="button"
                            onClick={handleViewPhoto}
                            style={{
                                width: "100%",
                                padding: "10px 16px",
                                border: "none",
                                background: "transparent",
                                color: "#111111",
                                fontSize: "14px",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f2f5"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                            <Image size={18} />
                            View photo
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleChangePhoto}
                        disabled={uploadingPhoto || removingPhoto}
                        style={{
                            width: "100%",
                            padding: "10px 16px",
                            border: "none",
                            background: "transparent",
                            color: uploadingPhoto || removingPhoto ? "#999999" : "#128c7e",
                            fontSize: "14px",
                            fontWeight: 600,
                            textAlign: "left",
                            cursor: uploadingPhoto || removingPhoto ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                        }}
                        onMouseEnter={(e) => { if (!uploadingPhoto && !removingPhoto) e.currentTarget.style.background = "#e8f5e9"; }}
                        onMouseLeave={(e) => { if (!uploadingPhoto && !removingPhoto) e.currentTarget.style.background = "transparent"; }}
                    >
                        <Camera size={18} />
                        Change photo
                    </button>
                    {selectedUser.profilePhoto && (
                        <>
                            <div style={{ height: "1px", background: "#d1d7db", margin: "4px 0" }} />
                            <button
                                type="button"
                                onClick={handleRemovePhoto}
                                disabled={removingPhoto}
                                style={{
                                    width: "100%",
                                    padding: "10px 16px",
                                    border: "none",
                                    background: "transparent",
                                    color: removingPhoto ? "#999999" : "#d32f2f",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    textAlign: "left",
                                    cursor: removingPhoto ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px"
                                }}
                                onMouseEnter={(e) => { if (!removingPhoto) e.currentTarget.style.background = "#fef2f2"; }}
                                onMouseLeave={(e) => { if (!removingPhoto) e.currentTarget.style.background = "transparent"; }}
                            >
                                <Trash2 size={18} />
                                Remove photo
                            </button>
                        </>
                    )}
                </div>
            )}

            {photoError && (
                <p style={{ marginTop: "8px", color: "#d32f2f", fontSize: "12px", textAlign: "center" }}>{photoError}</p>
            )}

            <strong className="cs-info-username">
                {selectedUser.username}
            </strong>

            <span className="cs-info-status">
                {selectedUser.isOnline
                    ? "Online"
                    : "Offline"}
            </span>

            <div className="cs-info-about">
                {!editingAbout ? (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span>About</span>
                            <button
                                type="button"
                                onClick={handleEditAbout}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#128c7e",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: "2px 8px",
                                    borderRadius: "4px"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#e8f5e9"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                                Edit
                            </button>
                        </div>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {selectedUser.about || "Hey there! I am using chatSpace"}
                        </p>
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span>About</span>
                        </div>
                        <textarea
                            value={aboutText}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 150) setAboutText(val);
                            }}
                            maxLength={150}
                            rows={3}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "10px",
                                border: "1px solid #d1d7db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                resize: "vertical",
                                outline: "none",
                                background: "#ffffff",
                                color: "#111111"
                            }}
                            placeholder="What's on your mind?"
                            aria-label="About"
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            <span style={{ fontSize: "12px", color: aboutText.length >= 150 ? "#d32f2f" : "#667781" }}>
                                {aboutText.length}/150
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    type="button"
                                    onClick={handleCancelAbout}
                                    disabled={aboutSaving}
                                    style={{
                                        padding: "8px 16px",
                                        border: "1px solid #d1d7db",
                                        borderRadius: "6px",
                                        background: "#ffffff",
                                        color: "#111111",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        cursor: aboutSaving ? "not-allowed" : "pointer",
                                        opacity: aboutSaving ? 0.6 : 1
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAbout}
                                    disabled={aboutSaving || aboutText.trim().length === 0}
                                    style={{
                                        padding: "8px 16px",
                                        border: "none",
                                        borderRadius: "6px",
                                        background: "#128c7e",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        cursor: (aboutSaving || aboutText.trim().length === 0) ? "not-allowed" : "pointer",
                                        opacity: (aboutSaving || aboutText.trim().length === 0) ? 0.6 : 1
                                    }}
                                >
                                    {aboutSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                        {aboutError && (
                            <p style={{ marginTop: "8px", color: "#d32f2f", fontSize: "12px" }}>{aboutError}</p>
                        )}
                    </>
                )}
            </div>

        </div>

        <section className="cs-info-section">
            <h3>Security</h3>

            <div className="cs-info-detail">
                <LockKeyhole size={17} />

                <div>
                    <span>Chat security</span>

                    <strong>
                        Messages are protected
                    </strong>
                </div>
            </div>
        </section>
    </>
) : (
    <div className="cs-info-empty">
        <MessageCircle size={24} />

        <span>
            Select a conversation to view details.
        </span>
    </div>
)}

       
    {/* Media */}
    <section className="cs-info-section">
        <h3>Media</h3>

        <div className="cs-info-media-grid">
            {messages
                .filter(
                    (msg) =>
                        msg.messageType === "image" &&
                        msg.fileUrl
                )
                .slice(-6)
                .map((msg) => (
                    <a
                        key={msg._id}
                        href={`http://localhost:3030${msg.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={
                            msg.fileName ||
                            "Open shared image"
                        }
                    >
                        <img
                            src={`http://localhost:3030${msg.fileUrl}`}
                            alt={
                                msg.fileName ||
                                "Shared image"
                            }
                        />
                    </a>
                ))}
        </div>

        {messages.every(
            (msg) => msg.messageType !== "image"
        ) && (
            <p className="cs-info-muted">
                No shared media yet.
            </p>
        )}
    </section>

    {/* Files */}
    <section className="cs-info-section">
        <h3>Files</h3>

        {messages
            .filter(
                (msg) =>
                    (msg.messageType === "file" ||
                        msg.messageType === "audio") &&
                    msg.fileUrl
            )
            .slice(-5)
            .map((msg) => (
                <a
                    className="cs-info-file"
                    key={msg._id}
                    href={`http://localhost:3030${msg.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <FileText size={16} />

                    <span>
                        {msg.fileName ||
                            "Voice message"}
                    </span>

                    <ChevronRight size={15} />
                </a>
            ))}

        {messages.every(
            (msg) =>
                msg.messageType !== "file" &&
                msg.messageType !== "audio"
        ) && (
            <p className="cs-info-muted">
                No shared files yet.
            </p>
        )}
    </section>

    {/* Links */}
    <section className="cs-info-section">
        <h3>Links</h3>

        {messages
            .filter((msg) =>
                /https?:\/\//i.test(
                    msg.message || ""
                )
            )
            .slice(-5)
            .map((msg) => {
                const link =
                    msg.message.match(
                        /https?:\/\/\S+/i
                    )?.[0];

                return (
                    <a
                        className="cs-info-file"
                        key={msg._id}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <MessageCircle size={15} />

                        <span>{link}</span>
                    </a>
                );
            })}

        {messages.every(
            (msg) =>
                !/https?:\/\//i.test(
                    msg.message || ""
                )
        ) && (
            <p className="cs-info-muted">
                No shared links yet.
            </p>
        )}
    </section>
</aside>

            {showAddMembers &&
                selectedGroup && (
                    <div
                        onClick={() => {
                            setShowAddMembers(
                                false
                            );
                            setSelectedMembers(
                                []
                            );
                            setMemberSearch(
                                ""
                            );
                        }}
                        style={{
                            position:
                                "fixed",
                            inset: 0,
                            background:
                                "rgba(16,24,32,0.48)",
                            display:
                                "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "center",
                            zIndex:
                                1000,
                            padding:
                                "16px"
                        }}
                    >
                        <div
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                            style={{
                                width:
                                    "100%",
                                maxWidth:
                                    "450px",
                                maxHeight:
                                    "80vh",
                                background:
                                    "#ffffff",
                                borderRadius:
                                    "12px",
                                overflow:
                                    "hidden",
                                display:
                                    "flex",
                                flexDirection:
                                    "column",
                                boxShadow:
                                    "0 20px 50px rgba(0,0,0,0.25)"
                            }}
                        >
                            <div
                                style={{
                                    padding:
                                        "18px",
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "center",
                                    borderBottom:
                                        "1px solid #eee"
                                }}
                            >
                                <div>
                                    <h2
                                        style={{
                                            margin:
                                                0
                                        }}
                                    >
                                        Add members
                                    </h2>

                                    <small
                                        style={{
                                            color:
                                                "#667781"
                                        }}
                                    >
                                        Add people to{" "}
                                        {
                                            selectedGroup.name
                                        }
                                    </small>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowAddMembers(
                                            false
                                        );
                                        setSelectedMembers(
                                            []
                                        );
                                    }}
                                    style={{
                                        border:
                                            "none",
                                        background:
                                            "#f0f2f5",
                                        borderRadius:
                                            "50%",
                                        width:
                                            "36px",
                                        height:
                                            "36px",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div
                                style={{
                                    padding:
                                        "14px"
                                }}
                            >
                                <input
                                    type="search"
                                    placeholder="Search people..."
                                    value={
                                        memberSearch
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setMemberSearch(
                                            e.target.value
                                        )
                                    }
                                    style={{
                                        width:
                                            "100%",
                                        boxSizing:
                                            "border-box",
                                        padding:
                                            "12px 15px",
                                        border:
                                            "1px solid #ddd",
                                        borderRadius:
                                            "22px",
                                        outline:
                                            "none"
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    flex:
                                        1,
                                    overflowY:
                                        "auto",
                                    padding:
                                        "0 14px"
                                }}
                            >
                                {availableMembers.length ===
                                0 ? (
                                    <p
                                        style={{
                                            color:
                                                "#667781"
                                        }}
                                    >
                                        No users available.
                                    </p>
                                ) : (
                                    availableMembers.map(
                                        (
                                            user
                                        ) => (
                                            <label
                                                key={
                                                    user._id
                                                }
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    padding:
                                                        "12px",
                                                    borderRadius:
                                                        "10px",
                                                    cursor:
                                                        "pointer",
                                                    background:
                                                        selectedMembers.includes(
                                                            user._id
                                                        )
                                                            ? "#e7fce9"
                                                            : "#ffffff"
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.includes(
                                                        user._id
                                                    )}
                                                    onChange={() =>
                                                        toggleMemberSelection(
                                                            user._id
                                                        )
                                                    }
                                                    style={{
                                                        marginRight:
                                                            "12px"
                                                    }}
                                                />

                                                <div
                                                    style={{
                                                        width:
                                                            "40px",
                                                        height:
                                                            "40px",
                                                        borderRadius:
                                                            "50%",
                                                        background:
                                                            "#dfe5e7",
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        justifyContent:
                                                            "center",
                                                        marginRight:
                                                            "12px"
                                                    }}
                                                >
                                                    👤
                                                </div>

                                                <strong>
                                                    {
                                                        user.username
                                                    }
                                                </strong>
                                            </label>
                                        )
                                    )
                                )}
                            </div>

                            <div
                                style={{
                                    padding:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee",
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "center"
                                }}
                            >
                                <span
                                    style={{
                                        color:
                                            "#667781"
                                    }}
                                >
                                    {
                                        selectedMembers.length
                                    }{" "}
                                    selected
                                </span>

                                <button
                                    onClick={
                                        addMembersToGroup
                                    }
                                    disabled={
                                        selectedMembers.length ===
                                        0
                                    }
                                    style={{
                                        border:
                                            "none",
                                        background:
                                            selectedMembers.length ===
                                            0
                                                ? "#cbd5e1"
                                                : "#25d366",
                                        color:
                                            "#ffffff",
                                        padding:
                                            "11px 20px",
                                        borderRadius:
                                            "22px",
                                        cursor:
                                            selectedMembers.length ===
                                            0
                                                ? "not-allowed"
                                                : "pointer",
                                        fontWeight:
                                            "bold"
                                    }}
                                >
                                    Add selected
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {showCreateGroup && (
                <div
                    role="presentation"
                    onClick={() => {
                        setShowCreateGroup(false);
                        setNewGroupName("");
                        setNewGroupMembers([]);
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(16,24,32,0.48)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2000,
                        padding: "16px",
                        boxSizing: "border-box"
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-group-title"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: "450px",
                            maxHeight: "80vh",
                            background: "#ffffff",
                            borderRadius: "8px",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
                        }}
                    >
                        <div
                            style={{
                                padding: "18px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: "1px solid #eee",
                                gap: "12px"
                            }}
                        >
                            <div>
                                <h2
                                    id="create-group-title"
                                    style={{ margin: 0 }}
                                >
                                    Create Group
                                </h2>
                                <small style={{ color: "#667781" }}>
                                    Add people to your new group
                                </small>
                            </div>

                            <button
                                type="button"
                                aria-label="Close create group dialog"
                                onClick={() => {
                                    setShowCreateGroup(false);
                                    setNewGroupName("");
                                    setNewGroupMembers([]);
                                }}
                                style={{
                                    border: "none",
                                    background: "#f0f2f5",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    flex: "0 0 36px",
                                    cursor: "pointer",
                                    fontSize: "16px"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: "16px" }}>
                            <input
                                type="text"
                                aria-label="Group name"
                                placeholder="Enter group name"
                                value={newGroupName}
                                onChange={(event) =>
                                    setNewGroupName(event.target.value)
                                }
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: "12px 15px",
                                    border: "1px solid #d1d7db",
                                    borderRadius: "8px",
                                    outline: "none",
                                    fontSize: "15px"
                                }}
                            />
                        </div>

                        <div
                            style={{
                                padding: "0 16px 10px",
                                color: "#667781",
                                fontWeight: "600"
                            }}
                        >
                            Select members
                        </div>

                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "0 16px"
                            }}
                        >
                            {users.length === 0 ? (
                                <p style={{ color: "#667781" }}>
                                    No users available.
                                </p>
                            ) : (
                                users
                                    .filter(
                                        (user) =>
                                            user._id?.toString() !==
                                            userId?.toString()
                                    )
                                    .map((user) => {
                                        const selected =
                                            newGroupMembers.includes(user._id);

                                        return (
                                            <label
                                                key={user._id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    padding: "11px",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    background: selected
                                                        ? "#e7fce9"
                                                        : "#ffffff"
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() =>
                                                        toggleNewGroupMember(
                                                            user._id
                                                        )
                                                    }
                                                    style={{
                                                        width: "18px",
                                                        height: "18px",
                                                        accentColor: "#128c7e"
                                                    }}
                                                />

                                                <div
                                                    style={{
                                                        width: "42px",
                                                        height: "42px",
                                                        flex: "0 0 42px",
                                                        borderRadius: "50%",
                                                        background: "#dfe5e7",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "20px"
                                                    }}
                                                >
                                                    👤
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <strong>{user.username}</strong>
                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "#667781",
                                                            overflowWrap: "anywhere"
                                                        }}
                                                    >
                                                        {user.email}
                                                    </div>
                                                </div>

                                            </label>
                                        );
                                    })
                            )}
                        </div>

                        <div
                            style={{
                                padding: "15px 16px",
                                borderTop: "1px solid #eee",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px"
                            }}
                        >
                            <span style={{ color: "#667781" }}>
                                {newGroupMembers.length} selected
                            </span>

                            <button
                                type="button"
                                onClick={createGroup}
                                disabled={
                                    !newGroupName.trim() ||
                                    newGroupMembers.length === 0
                                }
                                style={{
                                    border: "none",
                                    background:
                                        !newGroupName.trim() ||
                                        newGroupMembers.length === 0
                                            ? "#cbd5e1"
                                            : "#25d366",
                                    color: "#ffffff",
                                    padding: "11px 22px",
                                    borderRadius: "22px",
                                    cursor:
                                        !newGroupName.trim() ||
                                        newGroupMembers.length === 0
                                            ? "not-allowed"
                                            : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Photo Editor Modal
    const PhotoEditorModal = () => {
        if (!showPhotoEditor || !editImageUrl) return null;

        const handleCrop = (croppedAreaPixels) => {
            setCrop(croppedAreaPixels);
        };

        const handleZoomChange = (newZoom) => {
            setZoom(newZoom);
        };

        const handleRotate = (direction) => {
            setRotation((prev) => (prev + (direction === "left" ? -90 : 90)) % 360);
        };

        const handleReset = () => {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
        };

        const getCroppedCanvas = () => {
            const canvas = document.createElement("canvas");
            const scaleX = zoom;
            const scaleY = zoom;
            const ctx = canvas.getContext("2d");

            const size = Math.min(400, 400);
            canvas.width = size;
            canvas.height = size;

            const img = new Image();
            img.src = editImageUrl;

            return new Promise((resolve) => {
                img.onload = () => {
                    ctx.save();
                    ctx.translate(size / 2, size / 2);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.translate(-size / 2, -size / 2);

                    const srcX = (img.width - size / scaleX) / 2 + crop.x / scaleX;
                    const srcY = (img.height - size / scaleY) / 2 + crop.y / scaleY;
                    const srcWidth = size / scaleX;
                    const srcHeight = size / scaleY;

                    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);
                    ctx.restore();
                    resolve(canvas);
                };
            });
        };

        const handleSave = async () => {
            const canvas = await getCroppedCanvas();
            await handleCropComplete(canvas);
        };

        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    background: "rgba(0,0,0,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}
                onClick={closePhotoEditor}
            >
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        width: "100%",
                        maxWidth: "500px",
                        maxHeight: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{
                            padding: "16px",
                            borderBottom: "1px solid #d1d7db",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: "18px" }}>Edit Photo</h3>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={closePhotoEditor}
                                style={{
                                    padding: "8px 16px",
                                    border: "1px solid #d1d7db",
                                    borderRadius: "8px",
                                    background: "#ffffff",
                                    color: "#111111",
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={uploadingPhoto}
                                style={{
                                    padding: "8px 16px",
                                    border: "none",
                                    borderRadius: "8px",
                                    background: "#128c7e",
                                    color: "#ffffff",
                                    cursor: uploadingPhoto ? "not-allowed" : "pointer",
                                    opacity: uploadingPhoto ? 0.6 : 1
                                }}
                            >
                                {uploadingPhoto ? "Saving..." : "Save photo"}
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "20px",
                            overflow: "auto",
                            background: "#f0f2f5"
                        }}
                    >
                        <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                            <Cropper
                                image={editImageUrl}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={1}
                                onCropChange={handleCrop}
                                onZoomChange={handleZoomChange}
                                style={{
                                    width: "100%",
                                    height: "400px",
                                    background: "#e8eaed",
                                    borderRadius: "8px"
                                }}
                            />
                        </div>

                        <div style={{ padding: "16px 0", width: "100%", maxWidth: "400px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => handleRotate("left")}
                                    disabled={uploadingPhoto}
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #d1d7db",
                                        borderRadius: "8px",
                                        background: "#ffffff",
                                        cursor: uploadingPhoto ? "not-allowed" : "pointer"
                                    }}
                                >
                                    <RotateCcw size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRotate("right")}
                                    disabled={uploadingPhoto}
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #d1d7db",
                                        borderRadius: "8px",
                                        background: "#ffffff",
                                        cursor: uploadingPhoto ? "not-allowed" : "pointer"
                                    }}
                                >
                                    <RotateCw size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={uploadingPhoto}
                                    style={{
                                        padding: "8px 12px",
                                        border: "1px solid #d1d7db",
                                        borderRadius: "8px",
                                        background: "#ffffff",
                                        color: "#111111",
                                        fontSize: "13px",
                                        cursor: uploadingPhoto ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Reset
                                </button>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <ZoomOut size={20} color="#667781" />
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                                    disabled={uploadingPhoto}
                                    style={{ flex: 1 }}
                                />
                                <ZoomIn size={20} color="#667781" />
                                <span style={{ fontSize: "13px", color: "#667781", minWidth: "40px" }}>
                                    {Math.round(zoom * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // View Photo Modal
    const ViewPhotoModal = () => {
        if (!showViewPhoto || !selectedUser?.profilePhoto) return null;

        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    background: "rgba(0,0,0,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}
                onClick={closeViewPhoto}
            >
                <div
                    style={{
                        position: "relative",
                        maxWidth: "90vw",
                        maxHeight: "90vh"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={closeViewPhoto}
                        style={{
                            position: "absolute",
                            top: "-50px",
                            right: 0,
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(255,255,255,0.2)",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={`http://localhost:3030${selectedUser.profilePhoto}`}
                        alt={selectedUser.username}
                        style={{
                            maxWidth: "100%",
                            maxHeight: "90vh",
                            borderRadius: "8px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div
}

export default App;




