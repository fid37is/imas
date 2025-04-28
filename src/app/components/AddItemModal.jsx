"use client";
import { useState } from "react";
import Image from "next/image";

export default function AddItemModal({ isOpen, onClose, onSave }) {
    const [item, setItem] = useState({
        name: "",
        category: "",
        sku: "",
        price: 0,
        costPrice: 0,
        quantity: 0,
        lowStockThreshold: 5,
        imageUrl: "",
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setItem({
            ...item,
            [name]: type === "number" ? parseFloat(value) : value,
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            // Prepare item data with image URL if available
            let finalItem = { ...item };

            // If image file exists, upload it to Google Drive
            if (imageFile) {
                // This would be replaced with your actual Google Drive upload function
                const imageUrl = await uploadImageToGoogleDrive(imageFile);
                finalItem.imageUrl = imageUrl;
            }

            // Save the item
            await onSave(finalItem);

            // Reset form and close modal
            setItem({
                name: "",
                category: "",
                sku: "",
                price: 0,
                costPrice: 0,
                quantity: 0,
                lowStockThreshold: 5,
                imageUrl: "",
            });
            setImageFile(null);
            setImagePreview(null);
            onClose();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // Placeholder function for Google Drive upload
    const uploadImageToGoogleDrive = async (file) => {
        // This would be implemented with your Google Drive API integration
        // For now, return a placeholder URL
        return URL.createObjectURL(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-600">Add New Item</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={item.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                            </label>
                            <input
                                type="text"
                                name="category"
                                value={item.category}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SKU
                            </label>
                            <input
                                type="text"
                                name="sku"
                                value={item.sku}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Selling Price ($)
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={item.price}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cost Price ($)
                            </label>
                            <input
                                type="number"
                                name="costPrice"
                                value={item.costPrice}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                value={item.quantity}
                                onChange={handleChange}
                                min="0"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Low Stock Alert Threshold
                            </label>
                            <input
                                type="number"
                                name="lowStockThreshold"
                                value={item.lowStockThreshold}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                            {imagePreview && (
                                <div className="mt-2 relative h-40 w-40">
                                    <Image
                                        src={imagePreview}
                                        alt="Product preview"
                                        fill
                                        className="rounded-md object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-primary-700 font-medium rounded-md transition-colors"
                        >
                            {isUploading ? "Saving..." : "Save Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}