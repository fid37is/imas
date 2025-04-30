"use client"

export default function Loading() {
    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
                <div className="relative h-16 w-16 mx-auto mb-4">
                    {/* Spinner with two circles for better visual effect */}
                    <div className="absolute inset-0 rounded-full border-4 border-t-4 border-primary-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-t-4 border-accent-500 border-t-transparent animate-spin animate-reverse"></div>
                </div>
                <p className="text-primary-700 font-medium text-lg">Loading...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your data</p>
            </div>
        </div>
    );
}