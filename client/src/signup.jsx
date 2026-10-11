import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import axios from "axios";
import { auth, authReady } from "./firebase";

function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            await authReady;
            const username = form.username.trim();
            const availability = await axios.post("http://localhost:3030/username-availability", {
                username
            });
            if (!availability.data.available) {
                setError("Username already exists. Please choose another username.");
                return;
            }

            const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
            await updateProfile(credential.user, { displayName: username });
            const token = await credential.user.getIdToken(true);
            await axios.post("http://localhost:3030/signup", {}, {
                headers: { Authorization: `Bearer ${token}` },
                useProvidedAuthToken: true
            });
            await sendEmailVerification(credential.user);
            if (auth.currentUser?.uid === credential.user.uid) await signOut(auth);
            alert("Account created. Verify your email before signing in.");
            navigate("/");
        } catch (err) {
            if (err.code === "auth/email-already-in-use") {
                setError("A Firebase account already exists for this email. Sign in with that account to link it to ChatSpace.");
                return;
            }
            if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") {
                try {
                    const currentUser = auth.currentUser;
                    if (currentUser) await sendEmailVerification(currentUser);
                    await signOut(auth);
                    alert("Account created. Verify your email before signing in.");
                    navigate("/");
                    return;
                } catch (verificationError) {
                    setError(verificationError.message || "Could not send the verification email.");
                    return;
                }
            }
            setError(
                err.response?.data?.message ||
                (err.message === "Failed to fetch"
                    ? "Cannot connect to the server. Please check whether your backend is running."
                    : err.message)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>

                <div style={styles.logo}>C</div>

                <h1 style={styles.title}>Join ChatSpace</h1>

                <p style={styles.subtitle}>
                    Create your account and start connecting.
                </p>

                <form onSubmit={handleSubmit}>

                    <label style={styles.label}>
                        Username
                    </label>

                    <input
                        style={styles.input}
                        type="text"
                        name="username"
                        placeholder="Choose a username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        autoComplete="username"
                    />

                    <label style={styles.label}>
                        Email address
                    </label>

                    <input
                        style={styles.input}
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                    />

                    <label style={styles.label}>
                        Password
                    </label>

                    <div style={styles.passwordWrapper}>
                        <input
                            style={styles.passwordInput}
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            name="password"
                            placeholder="At least 6 characters"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />

                        <button
                            type="button"
                            style={styles.toggleButton}
                            onClick={() =>
                                setShowPassword(!showPassword)
                            }
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    <label style={styles.label}>
                        Confirm password
                    </label>

                    <div style={styles.passwordWrapper}>
                        <input
                            style={styles.passwordInput}
                            type={
                                showConfirmPassword
                                    ? "text"
                                    : "password"
                            }
                            name="confirmPassword"
                            placeholder="Enter your password again"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                        />

                        <button
                            type="button"
                            style={styles.toggleButton}
                            onClick={() =>
                                setShowConfirmPassword(
                                    !showConfirmPassword
                                )
                            }
                        >
                            {showConfirmPassword
                                ? "Hide"
                                : "Show"}
                        </button>
                    </div>

                    {error && (
                        <p style={styles.error}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading
                            ? "Creating account..."
                            : "Create Account"}
                    </button>

                </form>

                <p style={styles.footer}>
                    Already have an account?{" "}

                    <Link
                        to="/"
                        style={styles.link}
                    >
                        Log in
                    </Link>
                </p>

            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        background:
            "linear-gradient(135deg, #eef2ff, #f8faff 55%, #e9e7ff)",
        fontFamily: "Inter, Arial, sans-serif"
    },

    card: {
        width: "100%",
        maxWidth: "420px",
        padding: "36px",
        boxSizing: "border-box",
        background: "#ffffff",
        border: "1px solid #e7e8f0",
        borderRadius: "22px",
        boxShadow:
            "0 20px 60px rgba(45, 42, 100, 0.10)"
    },

    logo: {
        width: "52px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        background:
            "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#ffffff",
        fontSize: "27px",
        fontWeight: "800",
        marginBottom: "20px"
    },

    title: {
        margin: "0 0 10px",
        fontSize: "28px",
        color: "#17172e"
    },

    subtitle: {
        margin: "0 0 26px",
        color: "#77788d",
        fontSize: "14px",
        lineHeight: 1.6
    },

    label: {
        display: "block",
        marginBottom: "8px",
        marginTop: "16px",
        fontSize: "13px",
        fontWeight: "600",
        color: "#383950"
    },

    input: {
        width: "100%",
        padding: "13px 14px",
        boxSizing: "border-box",
        border: "1px solid #dfe1eb",
        borderRadius: "10px",
        outline: "none",
        fontSize: "14px",
        background: "#fcfcff"
    },

    passwordWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%"
    },

    passwordInput: {
        width: "100%",
        padding: "13px 60px 13px 14px",
        boxSizing: "border-box",
        border: "1px solid #dfe1eb",
        borderRadius: "10px",
        outline: "none",
        fontSize: "14px",
        background: "#fcfcff"
    },

    toggleButton: {
        position: "absolute",
        right: "10px",
        border: "none",
        background: "transparent",
        color: "#635bdb",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        padding: "5px"
    },

    button: {
        width: "100%",
        marginTop: "24px",
        padding: "14px",
        border: "none",
        borderRadius: "10px",
        background:
            "linear-gradient(135deg, #6366f1, #7c3aed)",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer"
    },

    error: {
        color: "#dc2626",
        fontSize: "13px",
        lineHeight: 1.5
    },

    footer: {
        marginTop: "24px",
        textAlign: "center",
        fontSize: "14px",
        color: "#77788d"
    },

    link: {
        color: "#635bdb",
        fontWeight: "700",
        textDecoration: "none"
    }
};

export default Signup;

