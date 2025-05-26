import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useState } from "react";
import { LogOut, Package } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Navbar({ activeView, setActiveView, user }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleOrderSelect = (order) => {
        // Handle order selection - you can implement this based on your needs
        console.log("Selected order:", order);
        setActiveView("orders");
    };

    return (
        <nav className="bg-[#00205b] shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
                <div className="flex justify-between h-16">
                    {/* Logo and brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            {/* Logo Placeholder */}
                            <img
                                src="/img/skeepr.png"
                                alt="Company Logo"
                                className="h-10 w-30 mr-3"
                            />
                            <span className="ml-2 text-sm text-gray-300 hidden sm:block">
                                Tool-Up Store
                            </span>
                        </div>
                    </div>

                    {/* Navigation buttons - middle (hidden on mobile) */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveView("dashboard")}
                                className={`px-4 py-2 transition-colors text-white ${activeView === "dashboard"
                                    ? "font-medium border-b-2 border-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveView("inventory")}
                                className={`px-4 py-2 transition-colors text-white ${activeView === "inventory"
                                    ? "font-medium border-b-2 border-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                Inventory
                            </button>
                            <button
                                onClick={() => setActiveView("orders")}
                                className={`px-4 py-2 transition-colors text-white flex items-center ${activeView === "orders"
                                    ? "font-medium border-b-2 border-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <Package className="w-4 h-4 mr-1" />
                                Orders
                            </button>
                        </div>
                    </div>

                    {/* Notifications and User section (hidden on mobile) */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                        {/* Notifications */}
                        <NotificationBell 
                            onOrderSelect={handleOrderSelect}
                            setActiveView={setActiveView}
                        />

                        <span className="text-sm text-gray-200">
                            {user.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-blue-800 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden space-x-2">
                        {/* Mobile Notifications */}
                        <NotificationBell 
                            onOrderSelect={handleOrderSelect}
                            setActiveView={setActiveView}
                        />

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
            <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden bg-blue-900`}>
                <div className="pt-2 pb-3 space-y-1">
                    <button
                        onClick={() => {
                            setActiveView("inventory");
                            setMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-base font-medium ${activeView === "inventory"
                            ? "bg-blue-800 text-white"
                            : "text-gray-200 hover:bg-blue-800 hover:text-white"
                            }`}
                    >
                        Inventory
                    </button>
                    <button
                        onClick={() => {
                            setActiveView("orders");
                            setMobileMenuOpen(false);
                        }}
                        className={`flex items-center w-full text-left px-3 py-2 text-base font-medium ${activeView === "orders"
                            ? "bg-blue-800 text-white"
                            : "text-gray-200 hover:bg-blue-800 hover:text-white"
                            }`}
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Orders
                    </button>
                    <button
                        onClick={() => {
                            setActiveView("dashboard");
                            setMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-base font-medium ${activeView === "dashboard"
                            ? "bg-blue-800 text-white"
                            : "text-gray-200 hover:bg-blue-800 hover:text-white"
                            }`}
                    >
                        Dashboard
                    </button>
                </div>
                <div className="pt-4 pb-3 border-t border-blue-800">
                    <div className="px-4 flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-200 truncate">
                            {user.email}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="ml-auto flex-shrink-0 bg-blue-900 p-1 text-red-400 hover:text-red-300"
                        >
                            <LogOut />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}