"use client"

export default function Loading() {
    const letters = 'skeepr'.split('');

    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                <div className="flex space-x-2">
                    {letters.map((letter, index) => (
                        <span 
                            key={index} 
                            className="text-6xl font-bold text-primary-500 inline-block"
                            style={{
                                animation: `wave 1s ease-in-out infinite`,
                                animationDelay: `${index * 0.15}s`
                            }}
                        >
                            {letter}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}