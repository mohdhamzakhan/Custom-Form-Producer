import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, ChevronDown, LayoutGrid } from "lucide-react";

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

    const displayName = user?.name || user?.username;
    const userInitial = displayName?.[0]?.toUpperCase() || "?";

    return (
        <nav className="relative bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-800 text-white shadow-lg">
            {/* Subtle dot-grid texture, matching the dashboard hero */}
            <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
                    backgroundSize: "18px 18px"
                }}
            />

            <div className="relative max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
                        <LayoutGrid size={16} className="text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">MEAI Custom Forms</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    {links && links.map(link => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition duration-150 ${isActive
                                        ? "bg-white/15 text-white shadow-inner"
                                        : "text-indigo-100/80 hover:bg-white/10 hover:text-white"
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
                            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-transparent hover:border-white/15 hover:bg-white/10 transition duration-150"
                        >
                            <div className="relative shrink-0">
                                <div className="bg-white/15 backdrop-blur border border-white/25 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                                    {userInitial}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-400 w-2.5 h-2.5 rounded-full ring-2 ring-indigo-900" />
                            </div>
                            <span className="font-medium text-sm">{displayName}</span>
                            <ChevronDown
                                size={15}
                                className={`text-indigo-200 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-gray-100">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Signed in as</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{displayName}</div>
                                </div>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                    <User size={15} className="text-gray-400" />
                                    Your Profile
                                </Link>
                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition"
                                >
                                    <LogOut size={15} />
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
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-white/10 focus:outline-none transition"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="relative md:hidden bg-indigo-950/95 backdrop-blur border-t border-white/10 pb-4 px-2 pt-2 space-y-1">
                    {links && links.map(link => {
                        const isActive = location.pathname.startsWith(link.path);
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMenuOpen(false)}
                                className={`block px-3 py-2 rounded-lg text-base font-medium transition duration-150 ${isActive ? "bg-white/15 text-white" : "text-indigo-100/80 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}

                    <div className="border-t border-white/10 pt-4 mt-2">
                        <div className="flex items-center px-3 py-2 gap-3">
                            <div className="bg-white/15 border border-white/25 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                                {userInitial}
                            </div>
                            <span className="font-medium text-sm">{displayName}</span>
                        </div>

                        <Link
                            to="/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-indigo-100/80 hover:bg-white/10 hover:text-white transition duration-150"
                        >
                            <User size={16} />
                            Your Profile
                        </Link>

                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                onLogout();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-rose-300 hover:bg-white/10 hover:text-rose-200 transition duration-150"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;