import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

// Layout component that includes the Navbar and wraps child components
export default function Layout({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        // Get user data from localStorage
        const storedUserData = localStorage.getItem("user");
        const token = localStorage.getItem("meaiFormToken");

        // If no token, redirect to login
        if (!token) {
            navigate("/login");
            return;
        }

        // Parse user data if available
        if (storedUserData && storedUserData !== "undefined") {
            try {
                const userData = JSON.parse(storedUserData);
                setUser(userData);
            } catch (error) {
                console.error("Error parsing user data:", error);
                // Invalid user data, clear localStorage and redirect to login
                localStorage.removeItem("user");
                localStorage.removeItem("meaiFormToken");
                navigate("/login");
            }
        } else {
            // No user data, redirect to login
            navigate("/login");
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("meaiFormToken");
        localStorage.removeItem("user");
        navigate("/login");
    };

    // Default navigation links
    const defaultLinks = [
        { name: "Dashboard", path: "/Mainpage" },
        { name: "Approval", path: "/reports" }
    ];

    // Add IT-specific links if user is in Sanand-IT group
    let navLinks = user?.groups?.includes("SANAND-IT")
        ? [
            ...defaultLinks,
            { name: "Create Form", path: "/formbuilder" },
            { name: "System Config", path: "/system-config" }
        ]
        : defaultLinks;

    navLinks = (user?.groups?.includes("Custom-Form_Creators") || user?.groups?.includes("SANAND-IT"))
        ? [
            ...defaultLinks,
            { name: "Create Form", path: "/formbuilder" }
        ]
        : defaultLinks;
    // Don't render anything until user is loaded
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={user} links={navLinks} onLogout={handleLogout} />
            <div className="max-w-8xl mx-auto px-15 py-5">
                {children}
            </div>
        </div>
    );
}