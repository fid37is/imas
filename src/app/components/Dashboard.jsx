"use client";
import { useState, useEffect } from "react";
import { Chart } from "chart.js/auto";

export default function Dashboard({ inventory, salesData }) {
    const [totalInventoryValue, setTotalInventoryValue] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [lowStockItems, setLowStockItems] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [profit, setProfit] = useState(0);
    const [topSellingItems, setTopSellingItems] = useState([]);
    const [categoryDistribution, setCategoryDistribution] = useState([]);

    useEffect(() => {
        // Calculate dashboard metrics
        calculateMetrics();

        // Create charts
        createCharts();

        // Cleanup charts on unmount
        return () => {
            const charts = Chart.instances;
            Object.keys(charts).forEach(key => {
                charts[key].destroy();
            });
        };
    }, [inventory, salesData]);

    const calculateMetrics = () => {
        // Calculate total inventory value and count
        let totalValue = 0;
        let lowStock = 0;

        inventory.forEach(item => {
            totalValue += item.price * item.quantity;
            if (item.quantity <= item.lowStockThreshold) {
                lowStock++;
            }
        });

        setTotalInventoryValue(totalValue);
        setTotalItems(inventory.length);
        setLowStockItems(lowStock);

        // Calculate sales metrics if data is available
        if (salesData && salesData.length) {
            const salesSum = salesData.reduce((sum, sale) => sum + sale.total, 0);
            const profitSum = salesData.reduce((sum, sale) => sum + sale.profit, 0);

            setTotalSales(salesSum);
            setProfit(profitSum);

            // Calculate top selling items
            const itemSales = {};
            salesData.forEach(sale => {
                if (itemSales[sale.itemId]) {
                    itemSales[sale.itemId].quantity += sale.quantity;
                    itemSales[sale.itemId].total += sale.total;
                } else {
                    itemSales[sale.itemId] = {
                        id: sale.itemId,
                        name: sale.itemName,
                        quantity: sale.quantity,
                        total: sale.total
                    };
                }
            });

            const topItems = Object.values(itemSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setTopSellingItems(topItems);
        }

        // Calculate category distribution
        const categories = {};
        inventory.forEach(item => {
            if (item.category) {
                if (categories[item.category]) {
                    categories[item.category]++;
                } else {
                    categories[item.category] = 1;
                }
            }
        });

        const categoryData = Object.entries(categories).map(([name, count]) => ({
            name,
            count
        }));

        setCategoryDistribution(categoryData);
    };

    const createCharts = () => {
        // Create sales over time chart
        if (salesData && salesData.length && document.getElementById('salesChart')) {
            const ctx = document.getElementById('salesChart').getContext('2d');

            // Group sales by date
            const salesByDate = {};
            salesData.forEach(sale => {
                const date = new Date(sale.date).toLocaleDateString();
                if (salesByDate[date]) {
                    salesByDate[date] += sale.total;
                } else {
                    salesByDate[date] = sale.total;
                }
            });

            const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Sales ($)',
                        data: sortedDates.map(date => salesByDate[date]),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sales Trend'
                        }
                    }
                }
            });
        }

        // Create category distribution chart
        if (categoryDistribution.length && document.getElementById('categoryChart')) {
            const ctx = document.getElementById('categoryChart').getContext('2d');

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categoryDistribution.map(cat => cat.name),
                    datasets: [{
                        data: categoryDistribution.map(cat => cat.count),
                        backgroundColor: [
                            '#FCD34D', '#34D399', '#60A5FA', '#F87171', '#A78BFA',
                            '#FBBF24', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Items by Category'
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold text-primary-500 mb-6">Dashboard</h2>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-gray-500 text-sm font-medium mb-1">Total Inventory Value</h3>
                    <p className="text-2xl font-bold text-primary-600">${totalInventoryValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">{totalItems} items in stock</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-gray-500 text-sm font-medium mb-1">Total Sales</h3>
                    <p className="text-2xl font-bold text-primary-600">${totalSales.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">{salesData?.length || 0} transactions</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-gray-500 text-sm font-medium mb-1">Total Profit</h3>
                    <p className="text-2xl font-bold text-accent-600">${profit.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">From all sales</p>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v4a1 1 0 11-2 0V9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                <span className="font-medium">Attention needed!</span> {lowStockItems} {lowStockItems === 1 ? 'item is' : 'items are'} running low on stock.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Sales Chart */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-lg font-semibold text-primary-600 mb-4">Sales Trend</h3>
                    <div className="h-64">
                        <canvas id="salesChart"></canvas>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-lg font-semibold text-primary-600 mb-4">Category Distribution</h3>
                    <div className="h-64">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
            </div>

            {/* Top Selling Items */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-primary-600 mb-4">Top Selling Items</h3>
                {topSellingItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-primary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Quantity Sold</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Total Sales</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {topSellingItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No sales data available</p>
                )}
            </div>
        </div>
    );
}