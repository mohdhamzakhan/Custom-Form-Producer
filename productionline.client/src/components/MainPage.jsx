import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import LoadingDots from './LoadingDots';
import { APP_CONSTANTS } from "./store";
import { FileText, ArrowRight } from "lucide-react";

// Only these forms get a card on the dashboard, even if the user has entry
// access to others too. Matches case-insensitively against a form's name
// containing any of these (e.g. "Competency" matches "Competency Mapping Test").
// Edit this list to add/remove which forms show up here.
const DASHBOARD_FORM_NAMES = ["Competency", "Gap Analysis"];

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
    const [entryForms, setEntryForms] = useState([]);
    const [entryFormsLoading, setEntryFormsLoading] = useState(true);
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

    // Forms this user has "entry" (fill) access to, for the dashboard card grid.
    useEffect(() => {
        if (!user) return;

        const fetchEntryForms = async () => {
            try {
                setEntryFormsLoading(true);
                const groupsParam = encodeURIComponent((user.groups || []).join(','));
                const res = await fetch(
                    `${APP_CONSTANTS.API_BASE_URL}/api/forms/entry-access?username=${encodeURIComponent(user.username || '')}&groups=${groupsParam}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setEntryForms(data || []);
                } else {
                    console.error("Failed to fetch entry-access forms");
                }
            } catch (error) {
                console.error("Error fetching entry-access forms:", error);
            } finally {
                setEntryFormsLoading(false);
            }
        };

        fetchEntryForms();
    }, [user]);

    if (loading) return <LoadingDots />;

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

            {!entryFormsLoading && entryForms.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Forms you can fill</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {entryForms.map(form => (
                            <button
                                key={form.id}
                                onClick={() => navigate(`/form/${form.id}`)}
                                className="text-left bg-white p-5 rounded-lg shadow hover:shadow-md hover:border-indigo-300 border border-transparent transition flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between">
                                    <FileText className="text-indigo-500" size={22} />
                                    <ArrowRight className="text-gray-300" size={18} />
                                </div>
                                <div className="font-semibold text-gray-800">{form.name}</div>
                                <div className="text-xs text-gray-400">Click to fill this form</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                            <button className="text-indigo-600 font-semibold hover:text-indigo-800">View Forms <a href="/reports">→</a></button>
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