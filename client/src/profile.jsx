import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Settings } from "lucide-react";
import { apiUrl } from "./config";
import { ProtectedImage } from "./components/ProtectedMedia";

function Profile() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [about, setAbout] = useState("");
    const [editing, setEditing] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [profilePhoto, setProfilePhoto] = useState(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {

        try {
            const response =
                await axios.get(
                    apiUrl("/profile")
                );

            const profile =
                response.data.user;

            setUser(profile);

            setNewUsername(
                profile.username
            );

            setAbout(
                profile.about ||
                ""
            );

            setProfilePhoto(
                profile.profilePhoto
            );

        } catch (error) {

            console.log(
                error.response?.data ||
                error.message
            );

        }

    }

    const handlePhotoChange = async (e) => {

        const file =
            e.target.files[0];

        if (!file) {
            return;
        }

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            alert(
                "Please select an image"
            );

            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {

            alert(
                "Image must be less than 10 MB"
            );

            return;
        }

        try {
            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            const response =
                await axios.put(
                    apiUrl("/profile/photo"),
                    formData
                );

            setProfilePhoto(
                response.data.profilePhoto
            );

        } catch (error) {

            console.log(
                error.response?.data ||
                error.message
            );

            alert(
                "Profile photo upload failed"
            );

        }

    };

    const updateProfile = async () => {

        try {
            await axios.put(
                apiUrl("/profile"),
                {
                    username:
                        newUsername,
                    about:
                        about
                }
            );

            alert(
                "Profile updated successfully"
            );

            setEditing(false);

            fetchProfile();

        } catch (error) {

            console.log(
                error.response?.data ||
                error.message
            );

            alert(
                error.response?.data?.message ||
                "Profile update failed"
            );

        }

    };

    if (!user) {

        return (
            <div
                style={{
                    padding: "30px"
                }}
            >
                Loading profile...
            </div>
        );

    }

    return (

            <main
                className="cs-profile-page"
            style={{
                width: "100%",
                minHeight: "100vh"
            }}
        >

            <div
                className="cs-profile-card"
                style={{
                    maxWidth: "500px",
                    margin: "0 auto",
                    minHeight: "100vh"
                }}
            >

                <div
                    className="cs-profile-header"
                    style={{
                        padding: "18px",
                        fontSize: "20px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate("/chat")}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: "inherit",
                            padding: 0,
                            font: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <span aria-hidden="true">←</span>
                        Profile
                    </button>

                    <button
                        type="button"
                        aria-label="Settings"
                        title="Settings"
                        onClick={() => navigate("/settings")}
                        style={{
                            border: "1px solid rgba(255,255,255,0.35)",
                            background: "rgba(255,255,255,0.1)",
                            color: "inherit",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "14px"
                        }}
                    >
                        <Settings size={17} /> Settings
                    </button>
                </div>

                <div
                    className="cs-profile-photo-section"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "30px"
                    }}
                >

                    <div
                        style={{
                            position: "relative"
                        }}
                    >

                        {profilePhoto ? (

                            <ProtectedImage
                                path={`/media/profiles/${user._id}`}
                                refreshKey={profilePhoto}
                                alt="Profile"
                                style={{
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "50%",
                                    objectFit: "cover"
                                }}
                            />

                        ) : (

                            <div
                                style={{
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "50%",
                                    background: "#d9d9d9",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "65px"
                                }}
                            >
                                👤
                            </div>

                        )}

                    </div>

                    <button
                        onClick={() =>
                            fileInputRef.current.click()
                        }
                        style={{
                            marginTop: "12px",
                            border: "none",
                            background: "transparent",
                            color: "var(--cs-brand)",
                            fontSize: "15px",
                            cursor: "pointer"
                        }}
                    >
                        📷 Change photo
                    </button>

                    <input
                        id="profile-photo-upload"
                        name="profilePhoto"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={
                            handlePhotoChange
                        }
                        style={{
                            display: "none"
                        }}
                    />

                </div>

                <div
                    className="cs-profile-details"
                    style={{
                        padding: "0 25px"
                    }}
                >

                    <p className="cs-profile-label">
                        Your name
                    </p>

                    {editing ? (

                        <input
                            id="profile-username"
                            name="username"
                            value={newUsername}
                            onChange={(e) =>
                                setNewUsername(
                                    e.target.value
                                )
                            }
                            className="cs-profile-input"
                        />

                    ) : (

                        <h3 className="cs-profile-value cs-profile-name">
                            {user.username}
                        </h3>

                    )}

                    <hr />

                    <p className="cs-profile-label">
                        About
                    </p>

                    {editing ? (

                        <input
                            id="profile-about"
                            name="about"
                            value={about}
                            onChange={(e) =>
                                setAbout(
                                    e.target.value
                                )
                            }
                            className="cs-profile-input"
                        />

                    ) : (

                        <p className="cs-profile-value cs-profile-about">
                            {about}
                        </p>

                    )}

                    <hr />

                    <p className="cs-profile-label">
                        Email
                    </p>

                    <p className="cs-profile-value cs-profile-email">
                        {user.email}
                    </p>

                    <br />

                    {editing ? (

                        <button
                            className="cs-profile-action"
                            onClick={
                                updateProfile
                            }
                            style={{
                                padding:
                                    "12px 20px",
                                border: "none",
                                borderRadius:
                                    "8px",
                                background:
                                    "var(--cs-brand)",
                                color: "#fff",
                                cursor:
                                    "pointer"
                            }}
                        >
                            Save Changes
                        </button>

                    ) : (

                        <button
                            className="cs-profile-action"
                            onClick={() =>
                                setEditing(true)
                            }
                            style={{
                                padding:
                                    "12px 20px",
                                border: "none",
                                borderRadius:
                                    "8px",
                                background:
                                    "var(--cs-brand)",
                                color: "#fff",
                                cursor:
                                    "pointer"
                            }}
                        >
                            Edit Profile
                        </button>

                    )}

                </div>

            </div>

        </main>

    );

}

export default Profile;
