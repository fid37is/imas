"use client";
import { useState, useEffect, useMemo } from "react";

const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
});

export function useDashboardData(inventory, salesData) {
    // Date filtering state
    const [dateRange, setDateRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [filteredSalesData, setFilteredSalesData] = useState([]);

    // Initialize from sessionStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedDateFilter = sessionStorage.getItem('dashboardDateFilter') || 'all';
            const savedStartDate = sessionStorage.getItem('dashboardCustomStartDate') || '';
            const savedEndDate = sessionStorage.getItem('dashboardCustomEndDate') || '';

            setDateRange(savedDateFilter);
            setCustomStartDate(savedStartDate);
            setCustomEndDate(savedEndDate);
        }
    }, []);

    // Save date preferences
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardDateFilter', dateRange);
            sessionStorage.setItem('dashboardCustomStartDate', customStartDate);
            sessionStorage.setItem('dashboardCustomEndDate', customEndDate);
        }
    }, [dateRange, customStartDate, customEndDate]);

    // Filter sales data based on date range
    useEffect(() => {
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
    }, [dateRange, salesData, customStartDate, customEndDate]);

    // Calculate inventory metrics
    const inventoryMetrics = useMemo(() => {
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        let totalValue = 0;
        let lowStock = 0;
        const categories = {};

        inventoryArray.forEach(item => {
            const price = Number(item?.price) || 0;
            const quantity = Number(item?.quantity) || 0;
            totalValue += price * quantity;
            
            if (quantity <= (item?.lowStockThreshold || 0)) {
                lowStock++;
            }

            if (item?.category) {
                categories[item.category] = (categories[item.category] || 0) + 1;
            }
        });

        const categoryDistribution = Object.entries(categories).map(([name, count]) => ({ name, count }));

        return {
            totalInventoryValue: totalValue,
            totalItems: inventoryArray.length,
            lowStockItems: lowStock,
            categoryDistribution
        };
    }, [inventory]);

    // Calculate sales metrics
    const salesMetrics = useMemo(() => {
        const salesArray = Array.isArray(filteredSalesData) ? filteredSalesData : [];
        let totalSales = 0;
        let totalProfit = 0;
        const itemSales = {};
        const salesByDate = {};

        salesArray.forEach(sale => {
            // Calculate sale total
            const actualSalePrice = Number(sale?.actualPrice ?? 0);
            const saleQuantity = Number(sale?.quantity ?? 0);
            const saleTotal = actualSalePrice > 0 ? actualSalePrice * saleQuantity : Number(sale?.totalPrice ?? sale?.total ?? 0);

            // Calculate profit
            let saleProfit = Number(sale?.profit ?? 0);
            if (saleProfit === 0 && actualSalePrice > 0 && sale?.costPrice) {
                saleProfit = (actualSalePrice - Number(sale.costPrice)) * saleQuantity;
            }

            totalSales += saleTotal;
            totalProfit += saleProfit;

            // Track item sales
            const itemId = sale?.itemId;
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

            // Track sales by date for chart
            if (sale?.timestamp || sale?.date) {
                const date = new Date(sale.timestamp || sale.date);
                if (!isNaN(date.getTime())) {
                    const dateStr = date.toLocaleDateString();
                    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + saleTotal;
                }
            }
        });

        const topSellingItems = Object.values(itemSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        const sortedSalesDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));

        return {
            totalSales,
            totalProfit,
            topSellingItems,
            salesByDate,
            sortedSalesDates,
            transactionCount: salesArray.length
        };
    }, [filteredSalesData]);

    // Utility functions
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

    return {
        // State
        dateRange,
        setDateRange,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        filteredSalesData,
        
        // Computed metrics
        ...inventoryMetrics,
        ...salesMetrics,
        
        // Utility functions
        formatCurrency,
        getDateRangeLabel
    };
}