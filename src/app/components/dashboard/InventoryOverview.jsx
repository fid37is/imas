import { useState, React } from "react";
import { InventoryTable } from "./InventoryTable";
import { CategoryStats } from "./CategoryStats";

const InventoryOverview = ({ inventory, formatCurrency }) => {
    const [viewType, setViewType] = useState('table'); // 'table' or 'stats'

    return (
        <div className="bg-white rounded-sm shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-primary-700">Inventory Overview</h3>
                    
                    {/* View Toggle */}
                    <div className="flex rounded-sm border border-gray-300 overflow-hidden">
                        <button
                            onClick={() => setViewType('table')}
                            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                viewType === 'table'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9" />
                                </svg>
                                <span>Table View</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setViewType('stats')}
                            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                viewType === 'stats'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Category Stats</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content container with consistent height and smooth transitions */}
            <div className="relative min-h-96 max-h-96 overflow-hidden">
                {/* Table View */}
                <div className={`
                    absolute inset-0 transition-all duration-300 ease-in-out overflow-auto
                    ${viewType === 'table' 
                        ? 'opacity-100 translate-x-0 pointer-events-auto' 
                        : 'opacity-0 translate-x-4 pointer-events-none'
                    }
                `}>
                    <InventoryTable inventory={inventory} formatCurrency={formatCurrency} />
                </div>

                {/* Stats View */}
                <div className={`
                    absolute inset-0 transition-all duration-300 ease-in-out overflow-auto
                    ${viewType === 'stats' 
                        ? 'opacity-100 translate-x-0 pointer-events-auto' 
                        : 'opacity-0 -translate-x-4 pointer-events-none'
                    }
                `}>
                    <div className="pt-4">
                        <CategoryStats inventory={inventory} formatCurrency={formatCurrency} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryOverview;