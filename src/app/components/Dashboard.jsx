"use client";
import { useState, useEffect } from "react";
import { Chart } from "chart.js/auto";
import DashboardHeader from "./dashboard/DashboardHeader";
import SalesDetailView from "./SalesDetailView";
import InventoryOverview from "./dashboard/InventoryOverview";

const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
});

export default function Dashboard({ inventory, salesData }) {
    // State management
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
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Initialize user preferences
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTab = sessionStorage.getItem('dashboardActiveTab') || 'overview';
            const savedDateFilter = sessionStorage.getItem('dashboardDateFilter') || 'all';
            const savedStartDate = sessionStorage.getItem('dashboardCustomStartDate') || '';
            const savedEndDate = sessionStorage.getItem('dashboardCustomEndDate') || '';

            setActiveTab(savedTab);
            setDateRange(savedDateFilter);
            setCustomStartDate(savedStartDate);
            setCustomEndDate(savedEndDate);
            setIsDataLoading(false);
        }
    }, []);

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
            cleanupCharts();
            const timeout = setTimeout(() => {
                createCharts();
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [activeTab, filteredSalesData, categoryDistribution, isDataLoading]);

    // Cleanup charts on component unmount
    useEffect(() => {
        return () => cleanupCharts();
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
            if (!customStartDate && !customEndDate) {
                setFilteredSalesData(salesData);
                return;
            }
            startDate = customStartDate ? new Date(customStartDate) : new Date(0);
            endDate = customEndDate ? new Date(customEndDate) : now;
            if (customEndDate) {
                endDate.setHours(23, 59, 59, 999);
            }
        } else {
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
                    startDate = new Date(0);
                    endDate = now;
            }
        }

        const filtered = salesData.filter(sale => {
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
            // Use actualPrice if available, otherwise fall back to totalPrice or total
            const actualSalePrice = Number(sale?.actualPrice ?? 0);
            const saleQuantity = Number(sale?.quantity ?? 0);
            const saleTotal = actualSalePrice > 0 ? actualSalePrice * saleQuantity : Number(sale?.totalPrice ?? sale?.total ?? 0);

            // Use recorded profit if available, otherwise calculate from actual prices
            let saleProfit = Number(sale?.profit ?? 0);
            if (saleProfit === 0 && actualSalePrice > 0 && sale?.costPrice) {
                saleProfit = (actualSalePrice - Number(sale.costPrice)) * saleQuantity;
            }

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
                itemSales[itemId].quantity += saleQuantity;
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

    const cleanupCharts = () => {
        if (typeof window !== 'undefined') {
            const chartInstances = Chart.instances || {};
            Object.keys(chartInstances).forEach(key => {
                if (chartInstances[key]) {
                    chartInstances[key].destroy();
                }
            });
        }
    };

    const createCharts = () => {
        const salesArray = Array.isArray(filteredSalesData) ? filteredSalesData : [];

        // Create sales chart
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

            let salesChart = Chart.getChart(ctx);
            if (salesChart) {
                salesChart.destroy();
            }

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

        // Create category chart
        if (categoryDistribution.length > 0 && document.getElementById('categoryChart')) {
            const ctx = document.getElementById('categoryChart');
            if (!ctx) return;

            let categoryChart = Chart.getChart(ctx);
            if (categoryChart) {
                categoryChart.destroy();
            }

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

    const TopSellingItemsTable = () => (
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
                    <p className="mt-2">
                        {dateRange !== 'all'
                            ? `No sales data available for the ${getDateRangeLabel().toLowerCase()}`
                            : 'No sales data available'
                        }
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Component */}
            <DashboardHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                dateRange={dateRange}
                setDateRange={setDateRange}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
                getDateRangeLabel={getDateRangeLabel}
            />

            {/* KPI Cards */}
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
                <>
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
                    <TopSellingItemsTable />
                </>
            )}

            {/* Sales Tab Content */}
            {activeTab === 'sales' && (
                <div className="space-y-6">
                    <TopSellingItemsTable />
                    <SalesDetailView salesData={filteredSalesData} />
                </div>
            )}

            {/* Inventory Tab Content */}

            {activeTab === 'inventory' && (
                <InventoryOverview
                    inventory={inventory}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}