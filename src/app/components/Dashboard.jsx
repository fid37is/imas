"use client";
import { useState, useEffect } from "react";
import { Chart } from "chart.js/auto";
import { Calendar } from "lucide-react";

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
    const [dateRange, setDateRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [chartsInitialized, setChartsInitialized] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Initialize and retrieve user preferences
    useEffect(() => {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
            // Retrieve active tab if available
            const savedTab = sessionStorage.getItem('dashboardActiveTab');
            if (savedTab) {
                setActiveTab(savedTab);
            }

            // Retrieve date filter if available
            const savedDateFilter = sessionStorage.getItem('dashboardDateFilter');
            if (savedDateFilter) {
                setDateRange(savedDateFilter);
            }

            // Retrieve custom dates if available
            const savedStartDate = sessionStorage.getItem('dashboardCustomStartDate');
            const savedEndDate = sessionStorage.getItem('dashboardCustomEndDate');
            if (savedStartDate) setCustomStartDate(savedStartDate);
            if (savedEndDate) setCustomEndDate(savedEndDate);

            // Signal data is now loaded
            setIsDataLoading(false);
        }
    }, []);

    // Save active tab whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardActiveTab', activeTab);
        }
    }, [activeTab]);

    // Save date filter whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardDateFilter', dateRange);
        }
    }, [dateRange]);

    // Save custom dates whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardCustomStartDate', customStartDate);
            sessionStorage.setItem('dashboardCustomEndDate', customEndDate);
        }
    }, [customStartDate, customEndDate]);

    // Apply date filter whenever it changes or salesData changes
    useEffect(() => {
        if (Array.isArray(salesData)) {
            applyDateFilter();
        }
    }, [dateRange, salesData, customStartDate, customEndDate]);

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

        if (dateRange === 'all') {
            setFilteredSalesData(salesData);
            return;
        }

        const now = new Date();
        let startDate, endDate;

        if (dateRange === 'custom') {
            // Handle custom date range
            if (!customStartDate && !customEndDate) {
                setFilteredSalesData(salesData);
                return;
            }

            startDate = customStartDate ? new Date(customStartDate) : new Date(0);
            endDate = customEndDate ? new Date(customEndDate) : now;

            // Set end date to end of day for better inclusivity
            if (customEndDate) {
                endDate.setHours(23, 59, 59, 999);
            }
        } else {
            // Handle predefined date ranges
            switch (dateRange) {
                case 'today':
                    startDate = new Date(now);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'yesterday':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now);
                    endDate.setDate(now.getDate() - 1);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 7);
                    endDate = now;
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 30);
                    endDate = now;
                    break;
                case '3months':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 90);
                    endDate = now;
                    break;
                case 'quarter':
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 3);
                    endDate = now;
                    break;
                case 'year':
                    startDate = new Date(now);
                    startDate.setFullYear(now.getFullYear() - 1);
                    endDate = now;
                    break;
                default:
                    startDate = new Date(0); // Beginning of time
                    endDate = now;
            }
        }

        const filtered = salesData.filter(sale => {
            // Handle both timestamp and date fields
            const saleDate = new Date(sale.timestamp || sale.date);
            if (isNaN(saleDate.getTime())) return false;

            return saleDate >= startDate && saleDate <= endDate;
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

    const getDateRangeLabel = () => {
        if (dateRange === 'custom') {
            if (customStartDate && customEndDate) {
                return `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
            } else if (customStartDate) {
                return `From ${new Date(customStartDate).toLocaleDateString()}`;
            } else if (customEndDate) {
                return `Until ${new Date(customEndDate).toLocaleDateString()}`;
            }
            return 'Custom Range';
        }

        const labels = {
            'all': 'All Time',
            'today': 'Today',
            'yesterday': 'Yesterday',
            'week': 'Last 7 Days',
            'month': 'Last 30 Days',
            '3months': 'Last 3 Months',
            'quarter': 'Last Quarter',
            'year': 'Last Year'
        };

        return labels[dateRange] || 'Selected Period';
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

                    {/* Date Range Selector with Calendar Icon */}
                    <div className="w-full sm:w-auto">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                className="pl-10 pr-8 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                                <option value="3months">Last 3 Months</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Custom Date Range Inputs */}
                {dateRange === 'custom' && (
                    <div className="w-full flex flex-col sm:flex-row gap-3 mt-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                max={customEndDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                min={customStartDate}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setCustomStartDate('');
                                    setCustomEndDate('');
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Date Range Display */}
            {dateRange !== 'all' && (
                <div className="mb-4 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
                    <span className="font-medium">Showing data for:</span> {getDateRangeLabel()}
                </div>
            )}

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
                            {dateRange !== 'all' && " in selected period"}
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
                            {dateRange !== 'all' ? `For selected period` : 'From all sales'}
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
                                            {dateRange !== 'all'
                                                ? `No sales data available for the ${getDateRangeLabel().toLowerCase()}`
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17l6-6-6-6" /></svg>
                            <p className="mt-2">
                                {dateRange !== 'all'
                                    ? `No sales data available for the ${getDateRangeLabel().toLowerCase()}`
                                    : 'No sales data available'
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Tab Content */}
            {activeTab === 'inventory' && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-primary-600">Inventory Overview</h3>
                    </div>
                    {Array.isArray(inventory) && inventory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-primary-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Quantity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Total Value</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {inventory.map((item, index) => {
                                        const quantity = Number(item?.quantity) || 0;
                                        const price = Number(item?.price) || 0;
                                        const lowStockThreshold = Number(item?.lowStockThreshold) || 0;
                                        const isLowStock = quantity <= lowStockThreshold;

                                        return (
                                            <tr key={item?.id || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item?.name || 'Unknown Item'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {item?.category || 'Uncategorized'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {quantity}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {formatCurrency(price)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {formatCurrency(price * quantity)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {isLowStock ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            In Stock
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="mt-2">No inventory items available</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}