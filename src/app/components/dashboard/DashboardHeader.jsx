"use client";
import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";

export default function DashboardHeader({ 
    activeTab, 
    setActiveTab, 
    dateRange, 
    setDateRange, 
    customStartDate, 
    setCustomStartDate, 
    customEndDate, 
    setCustomEndDate 
}) {
    // Save preferences to sessionStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardActiveTab', activeTab);
        }
    }, [activeTab]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardDateFilter', dateRange);
        }
    }, [dateRange]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboardCustomStartDate', customStartDate);
            sessionStorage.setItem('dashboardCustomEndDate', customEndDate);
        }
    }, [customStartDate, customEndDate]);

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
        <>
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

                    {/* Date Range Controls */}
                    <div className="flex items-center gap-3">
                        {/* Date Range Selector with Calendar Icon */}
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

                        {/* Custom Date Range Inputs - Inline */}
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                    max={customEndDate || new Date().toISOString().split('T')[0]}
                                />
                                <span className="text-gray-400 text-sm">-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                    min={customStartDate}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <button
                                    onClick={() => {
                                        setCustomStartDate('');
                                        setCustomEndDate('');
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Clear dates"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Date Range Display */}
            {dateRange !== 'all' && (
                <div className="mb-4 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
                    <span className="font-medium">Showing data for:</span> {getDateRangeLabel()}
                </div>
            )}
        </>
    );
}