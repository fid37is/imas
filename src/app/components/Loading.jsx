export default function Loading() {
    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                <p className="text-primary-500 font-medium">Loading...</p>
            </div>
        </div>
    );
}