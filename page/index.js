// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/router';

export default function Home({ user }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lowStockItems, setLowStockItems] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch inventory statistics
                const statsResponse = await fetch('/api/inventory?stats=true');
                const statsData = await statsResponse.json();

                // Fetch low stock items
                const lowStockResponse = await fetch('/api/items/low-stock');
                const lowStockData = await lowStockResponse.json();

                setStats(statsData);
                setLowStockItems(lowStockData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please log in to access your inventory</h1>
                    <Link href="/login" className="text-blue-500 hover:underline">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Head>
                <title>Inventory Management Dashboard</title>
            </Head>

            <div className="p-6">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Inventory Dashboard</h1>
                        <p className="text-gray-600">Welcome, {user.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                        Logout
                    </button>
                </header>

                {loading ? (
                    <div className="flex justify-center my-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Total Products" value={stats?.uniqueProducts || 0} />
                        <StatCard title="Total Items" value={stats?.totalItems || 0} />
                        <StatCard title="Total Value" value={`$${(stats?.totalValue || 0).toFixed(2)}`} />
                        <StatCard title="Potential Profit" value={`$${(stats?.potentialProfit || 0).toFixed(2)}`} />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ActionCard
                                title="Manage Inventory"
                                description="View, add, edit and delete inventory items"
                                link="/inventory"
                            />
                            <ActionCard
                                title="Record Sales"
                                description="Record new sales and update inventory"
                                link="/sales"
                            />
                            <ActionCard
                                title="Sales Reports"
                                description="View sales statistics and reports"
                                link="/reports"
                            />
                            <ActionCard
                                title="Export Data"
                                description="Export inventory data to CSV"
                                link="/api/inventory?export=csv"
                                isExternalLink={true}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Low Stock Items</h2>
                        {lowStockItems.length === 0 ? (
                            <p className="text-gray-500">No items are low in stock.</p>
                        ) : (
                            <div className="space-y-3">
                                {lowStockItems.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-gray-500">Qty: {item.quantity} (Min: {item.lowStockThreshold})</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded ${item.quantity === 0 ? 'bg-red-500 text-white' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                    </div>
                                ))}
                                {lowStockItems.length > 5 && (
                                    <Link href="/inventory?filter=low-stock" className="text-blue-500 hover:underline text-sm mt-2 block">
                                        View all {lowStockItems.length} low stock items
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 font-medium text-sm uppercase">{title}</h3>
        <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
);

const ActionCard = ({ title, description, link, isExternalLink = false }) => {
    const content = (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
            <h3 className="font-medium text-blue-800">{title}</h3>
            <p className="mt-1 text-sm text-blue-600">{description}</p>
        </div>
    );

    if (isExternalLink) {
        return (
            <a href={link} target="_blank" rel="noopener noreferrer">
                {content}
            </a>
        );
    }

    return (
        <Link href={link}>
            {content}
        </Link>
    );
};