import React, { useState, useMemo } from 'react';
import { Eye, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight, Search, Filter, SortAsc, SortDesc, X } from 'lucide-react';
import { SaleDetailModal } from './dashboard/sales/SaleDetailModal';


// Main Sales Detail View Component with Enhanced Filtering/Sorting
const SalesDetailView = ({ salesData }) => {
    const [selectedSale, setSelectedSale] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        priceRange: { min: '', max: '' },
        profitFilter: 'all', // 'all', 'profitable', 'loss'
        varianceFilter: 'all' // 'all', 'discounted', 'premium', 'standard'
    });
    const [showFilters, setShowFilters] = useState(false);

    const formatCurrency = (value) => {
        const amount = Number(value);
        if (isNaN(amount)) return '₦0.00';
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getPriceVarianceIcon = (actual, standard) => {
        const diff = Number(actual) - Number(standard);
        if (Math.abs(diff) < 0.01) return <Minus className="h-4 w-4 text-gray-600" />;
        if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
        return <TrendingDown className="h-4 w-4 text-red-600" />;
    };

    const getPriceVarianceText = (actual, standard) => {
        const actualNum = Number(actual);
        const standardNum = Number(standard);

        if (isNaN(actualNum) || isNaN(standardNum) || standardNum === 0) {
            return 'No data';
        }

        const diff = actualNum - standardNum;

        if (Math.abs(diff) < 0.01) return 'No change';

        const percentage = ((diff / standardNum) * 100).toFixed(1);

        if (diff > 0) return `+${formatCurrency(diff)} (+${percentage}%)`;
        return `${formatCurrency(diff)} (${percentage}%)`;
    };

    const getActualPrice = (sale) => {
        return Number(
            sale.actualPrice ??
            sale.unitPrice ??
            sale.sellingPrice ??
            sale.salePrice ??
            sale.price ??
            0
        );
    };

    const getStandardPrice = (sale) => {
        return Number(
            sale.standardPrice ??
            sale.basePrice ??
            sale.regularPrice ??
            sale.originalPrice ??
            sale.price ??
            0
        );
    };

    const calculateTotalPrice = (sale) => {
        if (sale.totalPrice && Number(sale.totalPrice) > 0) {
            return Number(sale.totalPrice);
        }

        const actualPrice = getActualPrice(sale);
        const quantity = Number(sale.quantity || 0);
        return actualPrice * quantity;
    };

    const calculateProfit = (sale) => {
        if (sale.profit !== undefined && sale.profit !== null && !isNaN(Number(sale.profit))) {
            return Number(sale.profit);
        }

        const actualPrice = getActualPrice(sale);
        const costPrice = Number(sale.costPrice || 0);
        const quantity = Number(sale.quantity || 0);

        if (costPrice > 0) {
            return (actualPrice - costPrice) * quantity;
        }

        return 0;
    };

    // Sorting function
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            dateRange: { start: '', end: '' },
            priceRange: { min: '', max: '' },
            profitFilter: 'all',
            varianceFilter: 'all'
        });
        setSortConfig({ key: null, direction: 'desc' });
        setCurrentPage(1);
    };

    // Process, filter, and sort sales data
    const processedSalesData = useMemo(() => {
        if (!salesData || !Array.isArray(salesData)) return [];

        let processed = salesData.map((sale, index) => ({
            ...sale,
            processedActualPrice: getActualPrice(sale),
            processedStandardPrice: getStandardPrice(sale),
            processedTotalPrice: calculateTotalPrice(sale),
            processedProfit: calculateProfit(sale)
        }));

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            processed = processed.filter(sale =>
                (sale.itemName || sale.name || '').toLowerCase().includes(searchLower) ||
                (sale.sku || '').toLowerCase().includes(searchLower) ||
                (sale.customer || '').toLowerCase().includes(searchLower)
            );
        }

        // Apply date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
            processed = processed.filter(sale => {
                const saleDate = new Date(sale.timestamp || sale.date || 0);
                if (isNaN(saleDate.getTime())) return false;

                if (filters.dateRange.start && saleDate < new Date(filters.dateRange.start)) return false;
                if (filters.dateRange.end && saleDate > new Date(filters.dateRange.end + 'T23:59:59')) return false;
                return true;
            });
        }

        // Apply price range filter
        if (filters.priceRange.min || filters.priceRange.max) {
            processed = processed.filter(sale => {
                const price = sale.processedActualPrice;
                if (filters.priceRange.min && price < Number(filters.priceRange.min)) return false;
                if (filters.priceRange.max && price > Number(filters.priceRange.max)) return false;
                return true;
            });
        }

        // Apply profit filter
        if (filters.profitFilter !== 'all') {
            processed = processed.filter(sale => {
                const profit = sale.processedProfit;
                if (filters.profitFilter === 'profitable') return profit > 0;
                if (filters.profitFilter === 'loss') return profit < 0;
                return true;
            });
        }

        // Apply variance filter
        if (filters.varianceFilter !== 'all') {
            processed = processed.filter(sale => {
                const actualPrice = sale.processedActualPrice;
                const standardPrice = sale.processedStandardPrice;
                const diff = actualPrice - standardPrice;

                if (filters.varianceFilter === 'discounted') return diff < -0.01;
                if (filters.varianceFilter === 'premium') return diff > 0.01;
                if (filters.varianceFilter === 'standard') return Math.abs(diff) < 0.01;
                return true;
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            processed.sort((a, b) => {
                let aVal, bVal;

                switch (sortConfig.key) {
                    case 'date':
                        aVal = new Date(a.timestamp || a.date || 0);
                        bVal = new Date(b.timestamp || b.date || 0);
                        break;
                    case 'item':
                        aVal = (a.itemName || a.name || '').toLowerCase();
                        bVal = (b.itemName || b.name || '').toLowerCase();
                        break;
                    case 'quantity':
                        aVal = Number(a.quantity || 0);
                        bVal = Number(b.quantity || 0);
                        break;
                    case 'actualPrice':
                        aVal = a.processedActualPrice;
                        bVal = b.processedActualPrice;
                        break;
                    case 'standardPrice':
                        aVal = a.processedStandardPrice;
                        bVal = b.processedStandardPrice;
                        break;
                    case 'total':
                        aVal = a.processedTotalPrice;
                        bVal = b.processedTotalPrice;
                        break;
                    case 'profit':
                        aVal = a.processedProfit;
                        bVal = b.processedProfit;
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by date descending
            processed.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        }

        return processed;
    }, [salesData, searchTerm, filters, sortConfig]);

    const totalPages = Math.ceil(processedSalesData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = processedSalesData.slice(startIndex, endIndex);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ?
            <SortAsc className="h-4 w-4 ml-1" /> :
            <SortDesc className="h-4 w-4 ml-1" />;
    };

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center text-sm text-gray-700">
                    <span>
                        Showing {startIndex + 1} to {Math.min(endIndex, processedSalesData.length)} of {processedSalesData.length} transactions
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="ml-4 border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    {pageNumbers.map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm rounded ${pageNum === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    };

    const activeFiltersCount = [
        searchTerm,
        filters.dateRange.start || filters.dateRange.end,
        filters.priceRange.min || filters.priceRange.max,
        filters.profitFilter !== 'all',
        filters.varianceFilter !== 'all'
    ].filter(Boolean).length;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header with Search and Filter Controls - Fixed height to prevent shifting */}
            <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-16">
                    <div className="flex-shrink-0">
                        <h3 className="text-lg font-medium text-gray-900">Sales Transactions</h3>
                        <div className="h-5 mt-1">
                            <p className="text-sm text-gray-600">
                                Total: {processedSalesData.length} transactions
                                {salesData && salesData.length !== processedSalesData.length &&
                                    ` (filtered from ${salesData.length})`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        {/* Search Bar - Fixed width to prevent jumping */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search items, SKU, customer..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {/* Filter Toggle - Fixed width to prevent jumping */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center px-3 py-2 text-sm border rounded-md transition-colors w-20 ${showFilters
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>

                            {/* Clear Filters - Fixed width space to prevent jumping */}
                            <div className="w-20">
                                {activeFiltersCount > 0 && (
                                    <button
                                        onClick={clearFilters}
                                        className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors text-center"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Panel - Reserved space to prevent layout shift */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-64 opacity-100 mt-4' : 'max-h-0 opacity-0'
                    }`}>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={filters.dateRange.start}
                                        onChange={(e) => {
                                            setFilters(prev => ({
                                                ...prev,
                                                dateRange: { ...prev.dateRange, start: e.target.value }
                                            }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Start date"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateRange.end}
                                        onChange={(e) => {
                                            setFilters(prev => ({
                                                ...prev,
                                                dateRange: { ...prev.dateRange, end: e.target.value }
                                            }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="End date"
                                    />
                                </div>
                            </div>

                            {/* Price Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        placeholder="Min price"
                                        value={filters.priceRange.min}
                                        onChange={(e) => {
                                            setFilters(prev => ({
                                                ...prev,
                                                priceRange: { ...prev.priceRange, min: e.target.value }
                                            }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max price"
                                        value={filters.priceRange.max}
                                        onChange={(e) => {
                                            setFilters(prev => ({
                                                ...prev,
                                                priceRange: { ...prev.priceRange, max: e.target.value }
                                            }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Profit Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Profit Status</label>
                                <select
                                    value={filters.profitFilter}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, profitFilter: e.target.value }));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Transactions</option>
                                    <option value="profitable">Profitable Only</option>
                                    <option value="loss">Loss Only</option>
                                </select>
                            </div>

                            {/* Price Variance Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price Variance</label>
                                <select
                                    value={filters.varianceFilter}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, varianceFilter: e.target.value }));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Prices</option>
                                    <option value="discounted">Discounted</option>
                                    <option value="premium">Premium</option>
                                    <option value="standard">Standard Price</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {processedSalesData.length > 0 ? (
                <>
                    {/* Enhanced Table with Sortable Headers */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center">
                                            Date
                                            {renderSortIcon('date')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('item')}
                                    >
                                        <div className="flex items-center">
                                            Item
                                            {renderSortIcon('item')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center">
                                            Qty
                                            {renderSortIcon('quantity')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('standardPrice')}
                                    >
                                        <div className="flex items-center">
                                            Standard Price
                                            {renderSortIcon('standardPrice')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('actualPrice')}
                                    >
                                        <div className="flex items-center">
                                            Actual Price
                                            {renderSortIcon('actualPrice')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('total')}
                                    >
                                        <div className="flex items-center">
                                            Total
                                            {renderSortIcon('total')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('profit')}
                                    >
                                        <div className="flex items-center">
                                            Profit
                                            {renderSortIcon('profit')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentPageData.map((sale, index) => {
                                    const { processedActualPrice, processedStandardPrice, processedTotalPrice, processedProfit } = sale;

                                    const priceDiff = processedActualPrice - processedStandardPrice;
                                    const isDiscounted = priceDiff < -0.01;
                                    const isPremium = priceDiff > 0.01;
                                    const hasVariance = Math.abs(priceDiff) >= 0.01;

                                    return (
                                        <tr key={sale.id || `${startIndex + index}`} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {sale.timestamp || sale.date ?
                                                    new Date(sale.timestamp || sale.date).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) :
                                                    'N/A'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                <div className="max-w-xs truncate" title={sale.itemName || sale.name || 'Unknown Item'}>
                                                    {sale.itemName || sale.name || 'Unknown Item'}
                                                </div>
                                                {sale.sku && (
                                                    <div className="text-xs text-gray-500">SKU: {sale.sku}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {sale.quantity || 0}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {processedStandardPrice > 0 ? formatCurrency(processedStandardPrice) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`font-medium ${isDiscounted ? 'text-red-600' :
                                                            isPremium ? 'text-green-600' : 'text-gray-900'
                                                        }`}>
                                                        {formatCurrency(processedActualPrice)}
                                                    </span>
                                                    {hasVariance && processedStandardPrice > 0 && (
                                                        <span className="ml-2">
                                                            {getPriceVarianceIcon(processedActualPrice, processedStandardPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {processedStandardPrice > 0 ? (
                                                    <span className={`${isDiscounted ? 'text-red-600' :
                                                            isPremium ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                        {hasVariance ?
                                                            getPriceVarianceText(processedActualPrice, processedStandardPrice) :
                                                            'No change'
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                {formatCurrency(processedTotalPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <span className={`font-medium ${processedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {formatCurrency(processedProfit)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedSale(sale)}
                                                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {renderPaginationControls()}
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                        {activeFiltersCount > 0 ? 'No matching transactions' : 'No Sales Transactions'}
                    </p>
                    <p className="text-gray-600">
                        {activeFiltersCount > 0
                            ? 'Try adjusting your filters to see more results.'
                            : 'Sales transactions will appear here once you start recording sales.'
                        }
                    </p>
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Sale Detail Modal */}
            <SaleDetailModal
                selectedSale={selectedSale}
                setSelectedSale={setSelectedSale}
                formatCurrency={formatCurrency}
                getPriceVarianceIcon={getPriceVarianceIcon}
                getPriceVarianceText={getPriceVarianceText}
            />
        </div>
    );
};

export default SalesDetailView;