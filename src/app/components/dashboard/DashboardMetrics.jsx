"use client";

export default function DashboardMetrics({ data, activeTab, createCharts }) {
    const {
        totalInventoryValue,
        totalItems,
        totalSales,
        totalProfit,
        lowStockItems,
        transactionCount,
        filteredSalesData,
        categoryDistribution,
        dateRange,
        formatCurrency,
        getDateRangeLabel
    } = data;

    return (
        <>
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
                            {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
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
                        <p className="text-xl font-bold text-accent-600">{formatCurrency(totalProfit)}</p>
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

            {/* Overview Charts */}
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
        </>
    );
}