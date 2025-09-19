import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom"; 
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react"; // Icons

const Navbar = ({ user, links, onLogout }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const userInitial = user?.name?.[0]?.toUpperCase() || "?";

    return (
        <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="text-2xl font-bold">MEAI Custom Forms</div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                    {links && links.map(link => {
                        const isActive = location.pathname === link.path; // 🔥 Check active tab
                        console.log(link.path)
                        console.log(link.name)
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${isActive ? "bg-blue-900" : "hover:bg-blue-700"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile - Desktop */}
                <div className="hidden md:flex items-center">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-blue-700 transition duration-150"
                        >
                            <div className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                {userInitial}
                            </div>
                            <span className="font-medium">{user?.username}</span>
                            <ChevronDown size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                                    Signed in as <span className="font-medium">{user?.username}</span>
                                </div>
                                <Link
                                    to="/profile"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <User size={16} className="mr-2" />
                                    Your Profile
                                </Link>
                                <button
                                    onClick={onLogout}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                                >
                                    <LogOut size={16} className="mr-2" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="inline-flex items-center justify-center p-2 rounded-md hover:bg-blue-700 focus:outline-none"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden bg-blue-800 pb-4 px-2 pt-2 space-y-1">
                    {links && links.map(link => {
                        const isActive = location.pathname.startsWith(link.path); // 🔥 Also active in mobile
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMenuOpen(false)}
                                className={`block px-3 py-2 rounded-md text-base font-medium transition duration-150 ${isActive ? "bg-blue-900" : "hover:bg-blue-700"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}

                    <div className="border-t border-blue-700 pt-4 mt-2">
                        <div className="flex items-center px-3 py-2">
                            <div className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                                {userInitial}
                            </div>
                            <span className="font-medium">{user?.username}</span>
                        </div>

                        <Link
                            to="/profile"
                            onClick={() => setMenuOpen(false)}
                            className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition duration-150 flex items-center"
                        >
                            <User size={16} className="mr-2" />
                            Your Profile
                        </Link>

                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                onLogout();
                            }}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:bg-blue-700 hover:text-white transition duration-150 flex items-center"
                        >
                            <LogOut size={16} className="mr-2" />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
