import {
    Bell,
    ChevronRight,
    Info,
    LogOut,
    Palette,
    Shield,
    UserRound,
    Volume2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";

const settingsSections = [
    {
        title: "ACCOUNT",
        rows: [
            {
                label: "Profile",
                description: "Manage your name, photo, and about",
                icon: UserRound,
                path: "/profile"
            },
            {
                label: "Privacy",
                description: "Control your visibility and conversations",
                icon: Shield,
                path: "/privacy"
            },
            {
                label: "Security",
                description: "Account access and session security",
                icon: Shield,
                path: "/security"
            }
        ]
    },
    {
        title: "APPEARANCE",
        rows: [
            {
                label: "Theme",
                description: "Choose how ChatSpace looks",
                icon: Palette,
                path: "/themes"
            },
            {
                label: "Chat background",
                description: "Personalize conversation surfaces",
                icon: Palette,
                path: "/chat-background"
            },
            {
                label: "Message style",
                description: "Adjust the look of message bubbles",
                icon: Info,
                path: "/message-style"
            }
        ]
    },
    {
        title: "NOTIFICATIONS",
        rows: [
            {
                label: "Notifications",
                description: "Manage message alerts",
                icon: Bell,
                path: "/notifications"
            },
            {
                label: "Sound",
                description: "Notification sounds and volume",
                icon: Volume2,
                path: "/sound"
            }
        ]
    },
    {
        title: "APPLICATION",
        rows: [
            {
                label: "About ChatSpace",
                description: "Real-Time Communication Platform",
                icon: Info,
                path: "/about"
            }
        ]
    }
];

function Settings() {
    const navigate = useNavigate();

    const logout = () => {
        sessionStorage.removeItem("token");
        socket.disconnect();
        navigate("/");
    };

    return (
        <main className="cs-settings-page">
            <div className="cs-settings-shell">

                <header className="cs-page-header">
                    <button
                        type="button"
                        className="cs-back-button"
                        onClick={() => navigate(-1)}
                    >
                        <ChevronRight
                            size={17}
                            className="cs-back-chevron"
                        />
                        <span>Settings</span>
                    </button>

                    <div className="cs-page-brand">
                        ChatSpace
                    </div>
                </header>

                <div className="cs-settings-intro">
                    <span className="cs-page-eyebrow">
                        PREFERENCES
                    </span>

                    <h1>Settings</h1>

                    <p>
                        Configure your ChatSpace account and experience.
                    </p>
                </div>

                {settingsSections.map((section) => (
                    <section
                        className="cs-settings-section"
                        key={section.title}
                    >
                        <h2>{section.title}</h2>

                        <div className="cs-settings-card">
                            {section.rows.map((row) => {
                                const Icon = row.icon;

                                return (
                                    <button
                                        type="button"
                                        className="cs-settings-row"
                                        key={row.label}
                                        onClick={() =>
                                            navigate(row.path)
                                        }
                                    >
                                        <span className="cs-settings-icon">
                                            <Icon size={18} />
                                        </span>

                                        <span className="cs-settings-copy">
                                            <strong>
                                                {row.label}
                                            </strong>

                                            <small>
                                                {row.description}
                                            </small>
                                        </span>

                                        <ChevronRight
                                            size={17}
                                            className="cs-settings-chevron"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}

                <section className="cs-settings-section">
                    <h2>ACCOUNT ACTION</h2>

                    <div className="cs-settings-card">
                        <button
                            type="button"
                            className="cs-settings-row cs-logout-row"
                            onClick={logout}
                        >
                            <span className="cs-settings-icon">
                                <LogOut size={18} />
                            </span>

                            <span className="cs-settings-copy">
                                <strong>Logout</strong>

                                <small>
                                    Sign out of this session
                                </small>
                            </span>

                            <ChevronRight
                                size={17}
                                className="cs-settings-chevron"
                            />
                        </button>
                    </div>
                </section>

            </div>
        </main>
    );
}

export default Settings;