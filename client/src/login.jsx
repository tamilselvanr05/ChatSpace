
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, authReady } from "./firebase";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            await authReady;
            const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
            if (!credential.user.emailVerified) {
                throw new Error("Please verify your email address before signing in.");
            }
            const token = await credential.user.getIdToken();
            await axios.post(
                "http://localhost:3030/login",
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                    useProvidedAuthToken: true
                }
            );

            if (auth.currentUser?.uid !== credential.user.uid) {
                setError("The signed-in account changed. Please sign in again.");
                return;
            }

            navigate("/chat");
        } catch (error) {
            if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
                setError("Invalid email or password.");
                return;
            }
            setError(
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Login failed. Please check your credentials and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-showcase">
                <Link to="/login" className="brand">
                    <span className="brand-icon">C</span>
                    <span>Chat<span className="brand-highlight">space</span></span>
                </Link>

                <div className="showcase-content">
                    <span className="eyebrow">YOUR SPACE TO CONNECT</span>
                    <h1>Conversations that bring people closer.</h1>
                    <p>
                        Your people, your groups, your moments.
                        Everything you need to stay connected in one place.
                    </p>

                    <div className="feature-list">
                        <div className="feature-item">
                            <span>✦</span>
                            <div>
                                <strong>Private conversations</strong>
                                <p>Chat one-to-one in real time.</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span>◈</span>
                            <div>
                                <strong>Groups that feel connected</strong>
                                <p>Bring your people together.</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span>♫</span>
                            <div>
                                <strong>More than messages</strong>
                                <p>Share files, images and voice messages.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="showcase-footer">
                    A little closer, wherever you are.
                </p>
            </section>

            <section className="auth-form-side">
                <div className="auth-card">
                    <div className="mobile-brand brand">
                        <span className="brand-icon">C</span>
                        <span>Chat<span className="brand-highlight">space</span></span>
                    </div>

                    <div className="auth-heading">
                        <span className="eyebrow">WELCOME BACK</span>
                        <h2>Good to see you again.</h2>
                        <p>Sign in to continue your conversations.</p>
                    </div>

                    {error && (
                        <div className="auth-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="auth-form">
                        <label htmlFor="login-email">Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="password-label-row">
                            <label htmlFor="login-password">Password</label>
                        </div>

                        <div className="password-field">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in to Chatspace"}
                            {!loading && <span>→</span>}
                        </button>
                    </form>

                    <p className="auth-switch">
                        New to Chatspace?
                        {" "}
                        <Link to="/signup">Create an account</Link>
                    </p>

                    <p className="auth-legal">
                        By continuing, you agree to use Chatspace responsibly.
                    </p>
                </div>
            </section>
        </main>
    );
}

export default Login;

