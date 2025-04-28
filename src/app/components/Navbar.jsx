import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Navbar({ activeView, setActiveView, user }) {
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <nav className="bg-primary-500 text-white shadow-lg">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold">IMAS</h1>
                        <span className="ml-2 text-sm bg-accent-500 text-primary-700 px-2 py-1 rounded-md">
                            Inventory Management
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex space-x-1">
                            <button
                                onClick={() => setActiveView("inventory")}
                                className={`px-4 py-2 rounded-md transition-colors ${activeView === "inventory"
                                        ? "bg-white text-primary-500"
                                        : "hover:bg-primary-400"
                                    }`}
                            >
                                Inventory
                            </button>
                            <button
                                onClick={() => setActiveView("dashboard")}
                                className={`px-4 py-2 rounded-md transition-colors ${activeView === "dashboard"
                                        ? "bg-white text-primary-500"
                                        : "hover:bg-primary-400"
                                    }`}
                            >
                                Dashboard
                            </button>
                        </div>

                        <div className="flex items-center">
                            <span className="mr-3 text-sm hidden md:inline">
                                {user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="bg-accent-500 hover:bg-accent-600 text-primary-700 font-medium px-3 py-1 rounded-md text-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile navigation buttons */}
                <div className="md:hidden flex pb-3 space-x-1">
                    <button
                        onClick={() => setActiveView("inventory")}
                        className={`flex-1 px-4 py-2 rounded-md transition-colors ${activeView === "inventory"
                                ? "bg-white text-primary-500"
                                : "hover:bg-primary-400"
                            }`}
                    >
                        Inventory
                    </button>
                    <button
                        onClick={() => setActiveView("dashboard")}
                        className={`flex-1 px-4 py-2 rounded-md transition-colors ${activeView === "dashboard"
                                ? "bg-white text-primary-500"
                                : "hover:bg-primary-400"
                            }`}
                    >
                        Dashboard
                    </button>
                </div>
            </div>
        </nav>
    );
}
