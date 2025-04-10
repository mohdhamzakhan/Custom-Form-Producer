import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

function parseJwt(token) {
    try {
        const base64Payload = token.split('.')[1]; // Get the payload
        const payload = atob(base64Payload);       // Decode base64
        return JSON.parse(payload);                // Parse JSON
    } catch (error) {
        console.error("Invalid token format:", error);
        return null;
    }
}

export default function MainPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // First check if we have user in localStorage
        const storedUserData = localStorage.getItem("user");
        const token = localStorage.getItem("meaiFormToken");

        if (!token) {
            navigate("/login");
            return;
        }

        // Check if stored user data exists and is valid
        if (storedUserData && storedUserData !== "undefined") {
            try {
                const storedUser = JSON.parse(storedUserData);
                setUser(storedUser);
                setLoading(false);
            } catch (error) {
                console.error("Error parsing stored user data:", error);
                // Continue to decode token since stored user data is invalid
                decodeTokenAndSetUser(token);
            }
        } else {
            // If no stored user but we have token, try to decode token
            decodeTokenAndSetUser(token);
        }
    }, [navigate]);

    // Helper function to decode token and set user data
    const decodeTokenAndSetUser = (token) => {
        const decodedUser = parseJwt(token);
        if (decodedUser) {
            const userData = {
                username: decodedUser.name || decodedUser.sub,
                groups: decodedUser.role ?
                    (Array.isArray(decodedUser.role) ? decodedUser.role : [decodedUser.role]) :
                    [],
                name: decodedUser.name || decodedUser.sub
            };

            setUser(userData);
            // Store user data for future use
            localStorage.setItem("user", JSON.stringify(userData));
        } else {
            // Invalid token
            localStorage.removeItem("meaiFormToken");
            localStorage.removeItem("user");
            navigate("/login");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <Layout>
            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <div className="flex items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-lg">
                        {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="ml-4">
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.username}!</h1>
                        <p className="text-gray-600">Access your dashboard and tools below</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {user.groups && user.groups.includes("SANAND-IT") ? (
                    <>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-indigo-700">IT Management</h2>
                            <p className="text-gray-600 mb-4">Manage IT resources, configurations and users</p>
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">Access Tools →</button>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-indigo-700">System Reports</h2>
                            <p className="text-gray-600 mb-4">View and generate system reports and analytics</p>
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">View Reports →</button>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-indigo-700">User Management</h2>
                            <p className="text-gray-600 mb-4">Manage user accounts and permissions</p>
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">Manage Users →</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-indigo-700">Your Forms</h2>
                            <p className="text-gray-600 mb-4">Access and fill out your assigned forms</p>
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">View Forms <a href ="/reports">→</a></button>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-indigo-700">Recent Activity</h2>
                            <p className="text-gray-600 mb-4">Review your recent form submissions</p>
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">View Activity →</button>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4 text-red-500">Limited Access</h2>
                            <p className="text-gray-600 mb-4">You do not have access to administrative features</p>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}