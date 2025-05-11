import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useState } from "react";

export default function Navbar({ activeView, setActiveView, user }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
                <div className="flex justify-between h-16">
                    {/* Logo and brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-primary-600">skeepr</span>
                            <span className="ml-2 text-sm text-gray-500 hidden sm:block">
                                Tool-Up Store
                            </span>
                        </div>
                    </div>
                    
                    {/* Navigation buttons - middle (hidden on mobile) */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <div className="flex space-x-4">
                            <button 
                                onClick={() => setActiveView("inventory")}
                                className={`px-4 py-2 transition-colors ${
                                    activeView === "inventory"
                                        ? "font-medium border-b-2 border-primary-500 text-primary-500"
                                        : "hover:text-primary-400"
                                }`}
                            >
                                Inventory
                            </button>
                            <button 
                                onClick={() => setActiveView("dashboard")}
                                className={`px-4 py-2 transition-colors ${
                                    activeView === "dashboard"
                                        ? "font-medium border-b-2 border-primary-500 text-primary-500"
                                        : "hover:text-primary-400"
                                }`}
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                    
                    {/* User and logout (hidden on mobile) */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                        <span className="text-sm text-gray-700">
                            {user.email}
                        </span>
                        <button 
                            onClick={handleLogout}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Logout
                        </button>
                    </div>
                    
                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {/* Icon when menu is closed */}
                            <svg
                                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                            {/* Icon when menu is open */}
                            <svg
                                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state */}
            <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
                <div className="pt-2 pb-3 space-y-1">
                    <button
                        onClick={() => {
                            setActiveView("inventory");
                            setMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-base font-medium ${
                            activeView === "inventory"
                                ? "bg-primary-50 border-l-4 border-primary-500 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300"
                        }`}
                    >
                        Inventory
                    </button>
                    <button
                        onClick={() => {
                            setActiveView("dashboard");
                            setMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-base font-medium ${
                            activeView === "dashboard"
                                ? "bg-primary-50 border-l-4 border-primary-500 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300"
                        }`}
                    >
                        Dashboard
                    </button>
                </div>
                <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="px-4 flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700 truncate">
                            {user.email}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="ml-auto flex-shrink-0 bg-white p-1 text-gray-400 hover:text-red-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}