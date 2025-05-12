"use client";
import { useState, useEffect } from "react";
import { Chart } from "chart.js/auto";

const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
});

export default function Dashboard({ inventory, salesData }) {
    const [totalInventoryValue, setTotalInventoryValue] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [lowStockItems, setLowStockItems] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [profit, setProfit] = useState(0);
    const [topSellingItems, setTopSellingItems] = useState([]);
    const [categoryDistribution, setCategoryDistribution] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [dateFilter, setDateFilter] = useState('all');
    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [chartsInitialized, setChartsInitialized] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Initialize and retrieve user preferences from localStorage
    useEffect(() => {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
            // Retrieve active tab from localStorage if available
            const savedTab = localStorage.getItem('dashboardActiveTab');
            if (savedTab) {
                setActiveTab(savedTab);
            }

            // Retrieve date filter from localStorage if available
            const savedDateFilter = localStorage.getItem('dashboardDateFilter');
            if (savedDateFilter) {
                setDateFilter(savedDateFilter);
            }

            // Signal data is now loaded
            setIsDataLoading(false);
        }
    }, []);

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardActiveTab', activeTab);
        }
    }, [activeTab]);

    // Save date filter to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardDateFilter', dateFilter);
        }
    }, [dateFilter]);

    // Apply date filter whenever it changes or salesData changes
    useEffect(() => {
        if (Array.isArray(salesData)) {
            applyDateFilter();
        }
    }, [dateFilter, salesData]);

    // Calculate metrics whenever filtered data or inventory changes
    useEffect(() => {
        calculateMetrics();
    }, [filteredSalesData, inventory]);

    // Create charts when data is ready and tab changes
    useEffect(() => {
        if (!isDataLoading && (activeTab === 'overview' || activeTab === 'sales')) {
            // Clean up old charts to prevent memory leaks
            cleanupCharts();

            // Add a small delay to ensure DOM elements are ready
            const timeout = setTimeout(() => {
                createCharts();
                setChartsInitialized(true);
            }, 100);

            return () => {
                clearTimeout(timeout);
            };
        }
    }, [activeTab, filteredSalesData, categoryDistribution, isDataLoading]);

    // Cleanup charts when component unmounts or before recreating
    const cleanupCharts = () => {
        if (typeof window !== 'undefined') {
            // Get all chart instances and destroy them
            const chartInstances = Chart.instances || {};
            Object.keys(chartInstances).forEach(key => {
                if (chartInstances[key]) {
                    chartInstances[key].destroy();
                }
            });
        }
    };

    // Cleanup charts on component unmount
    useEffect(() => {
        return () => {
            cleanupCharts();
        };
    }, []);

    const applyDateFilter = () => {
        if (!Array.isArray(salesData)) {
            setFilteredSalesData([]);
            return;
        }

        if (dateFilter === 'all') {
            setFilteredSalesData(salesData);
            return;
        }

        const now = new Date();
        let startDate;

        switch (dateFilter) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = new Date(0); // Beginning of time
        }

        const filtered = salesData.filter(sale => {
            // Handle both timestamp and date fields
            const saleDate = new Date(sale.timestamp || sale.date);
            return !isNaN(saleDate.getTime()) && saleDate >= startDate;
        });

        setFilteredSalesData(filtered);
    };

    const calculateMetrics = () => {
        // Handle inventory calculations
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        let totalValue = 0;
        let lowStock = 0;

        inventoryArray.forEach(item => {
            const price = Number(item?.price) || 0;
            const quantity = Number(item?.quantity) || 0;
            totalValue += price * quantity;
            if (quantity <= (item?.lowStockThreshold || 0)) lowStock++;
        });

        setTotalInventoryValue(totalValue);
        setTotalItems(inventoryArray.length);
        setLowStockItems(lowStock);

        // Handle sales calculations
        const salesArray = Array.isArray(filteredSalesData) ? filteredSalesData : [];
        let salesSum = 0;
        let profitSum = 0;
        const itemSales = {};

        salesArray.forEach(sale => {
            const saleTotal = Number(sale?.totalPrice ?? sale?.total ?? 0);
            const saleProfit = Number(sale?.profit ?? 0);
            const itemId = sale?.itemId;

            salesSum += saleTotal;
            profitSum += saleProfit;

            if (itemId) {
                if (!itemSales[itemId]) {
                    itemSales[itemId] = {
                        id: itemId,
                        name: sale?.itemName || 'Unknown Item',
                        quantity: 0,
                        total: 0,
                    };
                }
                itemSales[itemId].quantity += Number(sale?.quantity) || 0;
                itemSales[itemId].total += saleTotal;
            }
        });

        setTotalSales(salesSum);
        setProfit(profitSum);
        setTopSellingItems(
            Object.values(itemSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5)
        );

        // Calculate category distribution
        const categories = {};
        inventoryArray.forEach(item => {
            if (item?.category) {
                categories[item.category] = (categories[item.category] || 0) + 1;
            }
        });

        const categoryData = Object.entries(categories).map(([name, count]) => ({ name, count }));
        setCategoryDistribution(categoryData);
    };

    const createCharts = () => {
        const salesArray = Array.isArray(filteredSalesData) ? filteredSalesData : [];

        // Create sales chart if it exists and has data
        if (salesArray.length > 0 && document.getElementById('salesChart')) {
            const ctx = document.getElementById('salesChart');
            if (!ctx) return;

            const salesByDate = {};
            salesArray.forEach(sale => {
                if (sale?.timestamp || sale?.date) {
                    const date = new Date(sale.timestamp || sale.date);
                    if (!isNaN(date.getTime())) {
                        const dateStr = date.toLocaleDateString();
                        salesByDate[dateStr] = (salesByDate[dateStr] || 0) + Number(sale?.totalPrice ?? sale?.total ?? 0);
                    }
                }
            });

            const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));

            // Check if there's a chart already and destroy it
            let salesChart = Chart.getChart(ctx);
            if (salesChart) {
                salesChart.destroy();
            }

            // Create new chart
            salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Sales (₦)',
                        data: sortedDates.map(date => salesByDate[date]),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                    }
                }
            });
        }

        // Create category chart if it exists and has data
        if (categoryDistribution.length > 0 && document.getElementById('categoryChart')) {
            const ctx = document.getElementById('categoryChart');
            if (!ctx) return;

            // Check if there's a chart already and destroy it
            let categoryChart = Chart.getChart(ctx);
            if (categoryChart) {
                categoryChart.destroy();
            }

            // Create new chart
            categoryChart = new Chart(ctx, {
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
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { boxWidth: 12, padding: 15 }
                        }
                    }
                }
            });
        }
    };

    const formatCurrency = (value) => {
        const num = Number(value);
        return isNaN(num) ? '₦0.00' : currencyFormatter.format(num);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-2xl font-bold text-primary-500 mb-4 sm:mb-0">Dashboard</h1>

                <div className="w-full flex flex-col sm:flex-row justify-end gap-4 mb-4">
                    {/* Tab navigation */}
                    <div className="w-full sm:w-auto">
                        <div className="flex bg-gray-100 p-1 rounded-md shadow-sm">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'overview'
                                    ? 'bg-white shadow text-primary-600 font-medium'
                                    : 'text-gray-600 hover:text-primary-500'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'sales'
                                    ? 'bg-white shadow text-primary-600 font-medium'
                                    : 'text-gray-600 hover:text-primary-500'
                                    }`}
                            >
                                Sales
                            </button>
                            <button
                                onClick={() => setActiveTab('inventory')}
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'inventory'
                                    ? 'bg-white shadow text-primary-600 font-medium'
                                    : 'text-gray-600 hover:text-primary-500'
                                    }`}
                            >
                                Inventory
                            </button>
                        </div>
                    </div>

                    {/* Date Filter Dropdown */}
                    <div className="w-full sm:w-auto">
                        <div className="relative inline-block w-full">
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="block appearance-none w-full bg-white border border-gray-300 hover:border-primary-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last Month</option>
                                <option value="quarter">Last Quarter</option>
                                <option value="year">Last Year</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards - Always visible on all tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center">
                    <div className="rounded-full bg-blue-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Inventory Value</h3>
                        <p className="text-xl font-bold text-primary-600">{formatCurrency(totalInventoryValue)}</p>
                        <p className="text-sm text-gray-500 mt-1">{totalItems} items in stock</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 flex items-center">
                    <div className="rounded-full bg-green-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Sales</h3>
                        <p className="text-xl font-bold text-primary-600">{formatCurrency(totalSales)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredSalesData.length} {filteredSalesData.length === 1 ? 'transaction' : 'transactions'}
                            {dateFilter !== 'all' && " in selected period"}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 flex items-center">
                    <div className="rounded-full bg-purple-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Profit</h3>
                        <p className="text-xl font-bold text-accent-600">{formatCurrency(profit)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {dateFilter !== 'all' ? `For selected period` : 'From all sales'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems > 0 && (activeTab === 'overview' || activeTab === 'inventory') && (
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

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Sales Chart */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-primary-600">Sales Trend</h3>
                        </div>
                        <div className="p-4">
                            <div className="h-64">
                                {filteredSalesData.length > 0 ? (
                                    <canvas id="salesChart"></canvas>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">
                                            {dateFilter !== 'all'
                                                ? `No sales data available for the ${dateFilter === 'today' ? 'current day' :
                                                    dateFilter === 'week' ? 'last 7 days' :
                                                        dateFilter === 'month' ? 'last month' :
                                                            dateFilter === 'quarter' ? 'last quarter' : 'last year'}`
                                                : 'No sales data available'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-primary-600">Category Distribution</h3>
                        </div>
                        <div className="p-4">
                            <div className="h-64">
                                {categoryDistribution.length > 0 ? (
                                    <canvas id="categoryChart"></canvas>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">No category data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sales Tab Content */}
            {(activeTab === 'sales' || activeTab === 'overview') && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-primary-600">Top Selling Items</h3>
                    </div>
                    {topSellingItems.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-primary-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Quantity Sold</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Total Sales</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {topSellingItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name || "Unknown"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.quantity || 0}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17l6-6-6-6" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales data</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {dateFilter !== 'all'
                                    ? `No sales recorded for the selected time period.`
                                    : 'Start selling to see your top products.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Tab Content */}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Low Stock Items */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-primary-600">Low Stock Items</h3>
                        </div>
                        {inventory && lowStockItems > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-primary-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Current Stock</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Threshold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Array.isArray(inventory) && inventory
                                            .filter(item => (item.quantity <= item.lowStockThreshold))
                                            .map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name || "Unknown"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-500 font-medium">{item.quantity || 0}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.lowStockThreshold || 0}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">All stock levels are healthy</h3>
                                <p className="mt-1 text-sm text-gray-500">No items are currently below their threshold levels.</p>
                            </div>
                        )}
                    </div>

                    {/* Inventory Stats */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-primary-600">Inventory Stats</h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 gap-6">
                                {/* Inventory Value by Category */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Value by Category</h4>
                                    {categoryDistribution && categoryDistribution.length > 0 ? (
                                        <div className="space-y-2">
                                            {categoryDistribution.map((category, index) => {
                                                const inventoryArray = Array.isArray(inventory) ? inventory : [];
                                                const categoryItems = inventoryArray.filter(item => item.category === category.name);
                                                const categoryValue = categoryItems.reduce((sum, item) =>
                                                    sum + ((Number(item?.price) || 0) * (Number(item?.quantity) || 0)), 0);
                                                const percentage = totalInventoryValue > 0 ?
                                                    (categoryValue / totalInventoryValue) * 100 : 0;

                                                return (
                                                    <div key={index} className="relative pt-1">
                                                        <div className="flex mb-2 items-center justify-between">
                                                            <div>
                                                                <span className="text-xs font-semibold inline-block text-primary-600">
                                                                    {category.name}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-semibold inline-block text-primary-600">
                                                                    {formatCurrency(categoryValue)} ({percentage.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-100">
                                                            <div
                                                                style={{ width: `${percentage}%` }}
                                                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No category data available</p>
                                    )}
                                </div>

                                {/* Stock Level Summary */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Level Summary</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 p-3 rounded-lg text-center">
                                            <p className="text-sm text-gray-500">Healthy Items</p>
                                            <p className="text-xl font-bold text-green-600">
                                                {totalItems - lowStockItems}
                                            </p>
                                        </div>
                                        <div className="bg-red-50 p-3 rounded-lg text-center">
                                            <p className="text-sm text-gray-500">Low Stock Items</p>
                                            <p className="text-xl font-bold text-red-600">
                                                {lowStockItems}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}