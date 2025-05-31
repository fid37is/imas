import { useMemo } from "react";

export const CategoryStats = ({ inventory, formatCurrency }) => {
    const categoryData = useMemo(() => {
        if (!Array.isArray(inventory)) return [];
        
        const stats = {};
        let totalValue = 0;
        
        inventory.forEach(item => {
            const category = item?.category || 'Uncategorized';
            const quantity = Number(item?.quantity) || 0;
            const price = Number(item?.price) || 0;
            const value = price * quantity;
            
            if (!stats[category]) {
                stats[category] = 0;
            }
            
            stats[category] += value;
            totalValue += value;
        });
        
        return Object.entries(stats)
            .map(([name, value]) => ({
                name,
                value,
                percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [inventory]);

    if (categoryData.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories</h3>
                    <p className="text-gray-500">Add some inventory items to see category breakdown</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-11">
            <div className="mb-6">
                <p className="text-gray-600 mt-1">Breakdown of inventory value by category</p>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-gray-200">
                {categoryData.map((category, index) => (
                    <div
                        key={category.name}
                        className={`relative group transition-all duration-200 hover:bg-gray-25 ${
                            index !== categoryData.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                    >
                        {/* Progress Bar Background */}
                        <div className="absolute inset-0 overflow-hidden pb-1">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500/20 via-indigo-500/15 to-purple-500/10 transition-all duration-300 group-hover:from-blue-500/25 group-hover:via-indigo-500/20 group-hover:to-purple-500/15"
                                style={{ width: `${Math.max(category.percentage, 12)}%` }}
                            />
                        </div>
                        
                        {/* Content */}
                        <div className="relative px-4 sm:px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex-shrink-0" />
                                <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-700 transition-colors duration-200 truncate">
                                    {category.name}
                                </h3>
                            </div>
                            
                            <div className="flex items-center space-x-3 flex-shrink-0">
                                <div className="text-right">
                                    <div className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                                        {formatCurrency(category.value)}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500">
                                        {category.percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Summary */}
            {categoryData.length > 5 && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
                        <span className="text-sm font-medium text-gray-700">{categoryData.length} Categories Total</span>
                    </div>
                </div>
            )}
        </div>
    );
};