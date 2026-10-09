import { useState } from "react";
import {
    ArrowLeft,
    Bell,
    Check,
    Info,
    Lock,
    Palette,
    Shield,
    Volume2
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function SettingsDetail() {
    const navigate = useNavigate();
    const location = useLocation();

    const [notifications, setNotifications] = useState(
        localStorage.getItem("chatspace_notifications") !== "false"
    );

    const [messagePreview, setMessagePreview] = useState(
        localStorage.getItem("chatspace_message_preview") !== "false"
    );

    const [sound, setSound] = useState(
        localStorage.getItem("chatspace_sound") !== "false"
    );

    const [background, setBackground] = useState(
        localStorage.getItem("chatspace_background") || "default"
    );

    const [messageStyle, setMessageStyle] = useState(
        localStorage.getItem("chatspace_message_style") || "rounded"
    );

    const pageData = {
        "/privacy": {
            title: "Privacy",
            description: "Control your visibility and conversations.",
            icon: Shield
        },

        "/security": {
            title: "Security",
            description: "Manage your account access and session security.",
            icon: Lock
        },

        "/chat-background": {
            title: "Chat background",
            description: "Personalize your conversation background.",
            icon: Palette
        },

        "/message-style": {
            title: "Message style",
            description: "Adjust the appearance of your message bubbles.",
            icon: Info
        },

        "/notifications": {
            title: "Notifications",
            description: "Manage your ChatSpace message alerts.",
            icon: Bell
        },

        "/sound": {
            title: "Sound",
            description: "Control notification sounds.",
            icon: Volume2
        },

        "/about": {
            title: "About ChatSpace",
            description: "Real-Time Communication Platform.",
            icon: Info
        }
    };

    const current = pageData[location.pathname];

    if (!current) {
        return null;
    }

    const Icon = current.icon;

    const saveNotifications = (value) => {
        setNotifications(value);
        localStorage.setItem(
            "chatspace_notifications",
            value
        );
    };

    const savePreview = (value) => {
        setMessagePreview(value);
        localStorage.setItem(
            "chatspace_message_preview",
            value
        );
    };

    const saveSound = (value) => {
        setSound(value);
        localStorage.setItem(
            "chatspace_sound",
            value
        );
    };

    const saveBackground = (value) => {
        setBackground(value);
        localStorage.setItem(
            "chatspace_background",
            value
        );

        window.dispatchEvent(
            new Event("chatspace-settings-change")
        );
    };

    const saveMessageStyle = (value) => {
        setMessageStyle(value);
        localStorage.setItem(
            "chatspace_message_style",
            value
        );

        window.dispatchEvent(
            new Event("chatspace-settings-change")
        );
    };

    return (
        <main className="cs-settings-page">
            <div className="cs-settings-shell">

                <header className="cs-page-header">
                    <button
                        type="button"
                        className="cs-back-button"
                        onClick={() => navigate("/settings")}
                    >
                        <ArrowLeft size={17} />
                        <span>Settings</span>
                    </button>

                    <div className="cs-page-brand">
                        ChatSpace
                    </div>
                </header>

                <div className="cs-settings-intro">
                    <span className="cs-page-eyebrow">
                        CHATSPACE
                    </span>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            marginTop: "12px"
                        }}
                    >
                        <div
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#fff1ec",
                                color: "#ef6b4f"
                            }}
                        >
                            <Icon size={22} />
                        </div>

                        <div>
                            <h1 style={{ margin: 0 }}>
                                {current.title}
                            </h1>

                            <p style={{ marginTop: "6px" }}>
                                {current.description}
                            </p>
                        </div>
                    </div>
                </div>

                {location.pathname === "/privacy" && (
                    <div className="cs-settings-card">

                        <SettingToggle
                            title="Show online status"
                            description="Allow other users to see when you are online."
                            checked={true}
                            disabled={true}
                        />

                        <SettingToggle
                            title="Read receipts"
                            description="Allow others to know when you have read their messages."
                            checked={true}
                            disabled={true}
                        />

                        <SettingToggle
                            title="Typing indicator"
                            description="Show when you are typing a message."
                            checked={true}
                            disabled={true}
                        />

                    </div>
                )}

                {location.pathname === "/security" && (
                    <div className="cs-settings-card">

                        <div className="cs-detail-item">
                            <div>
                                <strong>Session security</strong>
                                <small>
                                    Your login session is protected using authentication tokens.
                                </small>
                            </div>

                            <Check size={19} />
                        </div>

                        <div className="cs-detail-item">
                            <div>
                                <strong>Password protection</strong>
                                <small>
                                    Passwords are securely processed by the server.
                                </small>
                            </div>

                            <Check size={19} />
                        </div>

                        <button
                            className="cs-action-button"
                            type="button"
                            onClick={() => alert("Password reset feature can be connected here.")}
                        >
                            Manage password
                        </button>

                    </div>
                )}

                {location.pathname === "/chat-background" && (
                    <div className="cs-settings-card">

                        <BackgroundOption
                            label="Default"
                            value="default"
                            selected={background}
                            onClick={saveBackground}
                        />

                        <BackgroundOption
                            label="Soft"
                            value="soft"
                            selected={background}
                            onClick={saveBackground}
                        />

                        <BackgroundOption
                            label="Midnight"
                            value="midnight"
                            selected={background}
                            onClick={saveBackground}
                        />

                        <BackgroundOption
                            label="Lavender"
                            value="lavender"
                            selected={background}
                            onClick={saveBackground}
                        />

                    </div>
                )}

                {location.pathname === "/message-style" && (
                    <div className="cs-settings-card">

                        <BackgroundOption
                            label="Rounded"
                            value="rounded"
                            selected={messageStyle}
                            onClick={saveMessageStyle}
                        />

                        <BackgroundOption
                            label="Compact"
                            value="compact"
                            selected={messageStyle}
                            onClick={saveMessageStyle}
                        />

                        <BackgroundOption
                            label="Modern"
                            value="modern"
                            selected={messageStyle}
                            onClick={saveMessageStyle}
                        />

                    </div>
                )}

                {location.pathname === "/notifications" && (
                    <div className="cs-settings-card">

                        <SettingToggle
                            title="Message notifications"
                            description="Receive notifications when a new message arrives."
                            checked={notifications}
                            onChange={saveNotifications}
                        />

                        <SettingToggle
                            title="Message preview"
                            description="Show message content in notifications."
                            checked={messagePreview}
                            onChange={savePreview}
                        />

                    </div>
                )}

               {location.pathname === "/sound" && (
    <div className="cs-settings-card">

        <SettingToggle
            title="Notification sound"
            description="Play a sound when a new message arrives."
            checked={sound}
            onChange={saveSound}
        />

       
<button
    type="button"
    className="cs-action-button"
    onClick={() => {
        const AudioContext =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContext) {
            alert("Audio is not supported in this browser.");
            return;
        }

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
            console.error("Could not play test sound:", error);
        });
    }}
>
    Test notification sound
</button>

    </div>
)}

                {location.pathname === "/about" && (
                    <div className="cs-settings-card">

                        <div className="cs-about-box">
                            <div className="cs-about-logo">
                                C
                            </div>

                            <h2>ChatSpace</h2>

                            <p>
                                Real-Time Communication Platform
                            </p>

                            <span>
                                Built with MERN Stack,
                                Socket.IO and MongoDB.
                            </span>

                            <small>
                                Version 1.0.0
                            </small>
                        </div>

                    </div>
                )}

            </div>
        </main>
    );
}

function SettingToggle({
    title,
    description,
    checked,
    onChange,
    disabled = false
}) {
    return (
        <div className="cs-detail-item">

            <div>
                <strong>{title}</strong>

                <small>
                    {description}
                </small>
            </div>

            <button
                type="button"
                disabled={disabled}
                onClick={() =>
                    onChange && onChange(!checked)
                }
                style={{
                    width: "48px",
                    height: "27px",
                    border: "none",
                    borderRadius: "20px",
                    background: checked
                        ? "#ef6b4f"
                        : "#d7d7d7",
                    position: "relative",
                    cursor: disabled
                        ? "default"
                        : "pointer",
                    opacity: disabled ? 0.7 : 1
                }}
            >
                <span
                    style={{
                        position: "absolute",
                        top: "4px",
                        left: checked
                            ? "25px"
                            : "4px",
                        width: "19px",
                        height: "19px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        transition: "0.2s"
                    }}
                />
            </button>

        </div>
    );
}

function BackgroundOption({
    label,
    value,
    selected,
    onClick
}) {
    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className="cs-detail-option"
        >
            <span>
                {label}
            </span>

            {selected === value && (
                <Check size={18} />
            )}
        </button>
    );
}

export default SettingsDetail;