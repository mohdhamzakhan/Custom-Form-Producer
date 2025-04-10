import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.getElementById("username")?.focus();
    }, []);
    // Check if user is already logged in
    useEffect(() => {
        const token = localStorage.getItem("meaiFormToken");
        if (token) {
            navigate("/Mainpage");
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://localhost:5182/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                // Store token
                localStorage.setItem("meaiFormToken", data.token);

                // Create and store user object, adapting to the response structure
                const userData = {
                    username: data.username || username,
                    groups: data.groups || [],
                    name: data.username || username // Using username as name since we don't have full name
                };

                localStorage.setItem("user", JSON.stringify(userData));
                console.log("Login successful, user data stored:", userData);
                const params = new URLSearchParams(location.search);
                const redirectUrl = params.get('redirect') || '/mainpage'; // Default to home if no redirect param

                navigate(redirectUrl);
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Invalid username or password");
            }
        } catch (error) {
            console.error("Login error:", error);
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-indigo-100">
            <div className="w-full max-w-md">
                <form
                    onSubmit={handleLogin}
                    className="bg-white p-8 rounded-lg shadow-lg"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
                        <p className="text-gray-600 mt-2">Sign in to your account</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter your username"
                            disabled={loading}
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 flex items-center justify-center ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Logging in...
                            </>
                        ) : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;