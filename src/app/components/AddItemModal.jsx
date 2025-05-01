"use client";
import { useState, useEffect } from 'react';
import { generateSKU } from '../utils/skuGenerator';

export default function AddItemModal({ isOpen, onClose, onSave, itemToEdit = null }) {
    const [imageFile, setImageFile] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',  // Selling price
        costPrice: '', // Added cost price
        quantity: '',
        sku: '',
        lowStockThreshold: '',
        description: ''
    });

    // Predefined categories
    const categories = [
        'Electronics',
        'Clothing',
        'Home & Kitchen',
        'Books',
        'Toys & Games',
        'Sports & Outdoors',
        'Beauty & Personal Care',
        'Office Supplies',
        'Other'
    ];

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [autoGenerateSKU, setAutoGenerateSKU] = useState(!itemToEdit);

    // If itemToEdit is provided, populate the form with its data
    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                name: itemToEdit.name || '',
                category: itemToEdit.category || '',
                price: itemToEdit.price || '',
                costPrice: itemToEdit.costprice || '',
                quantity: itemToEdit.quantity || '',
                sku: itemToEdit.sku || '',
                lowStockThreshold: itemToEdit.lowstockthreshold || '',
                description: itemToEdit.description || ''
            });
            setAutoGenerateSKU(false);
        } else {
            // Reset form for new item
            setFormData({
                name: '',
                category: '',
                price: '',
                costPrice: '',
                quantity: '',
                sku: '',
                lowStockThreshold: '',
                description: ''
            });
            setAutoGenerateSKU(true);
        }
        // Clear image file when modal opens/changes
        setImageFile(null);
        setSubmitError('');
        setErrors({});
    }, [itemToEdit, isOpen]);

    // Auto-generate SKU when name or category changes if autoGenerateSKU is true
    useEffect(() => {
        if (autoGenerateSKU && formData.name && formData.category) {
            const newSKU = generateSKU(formData.name, formData.category);
            setFormData(prev => ({
                ...prev,
                sku: newSKU
            }));
        }
    }, [formData.name, formData.category, autoGenerateSKU]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    // Handle SKU auto-generation toggle
    const handleSKUToggle = () => {
        setAutoGenerateSKU(!autoGenerateSKU);

        // If turning on auto-generation, update SKU immediately
        if (!autoGenerateSKU && formData.name && formData.category) {
            const newSKU = generateSKU(formData.name, formData.category);
            setFormData(prev => ({
                ...prev,
                sku: newSKU
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.category.trim()) {
            newErrors.category = 'Category is required';
        }

        if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
            newErrors.price = 'Valid selling price is required';
        }

        if (!formData.costPrice || isNaN(Number(formData.costPrice)) || Number(formData.costPrice) < 0) {
            newErrors.costPrice = 'Valid cost price is required';
        }

        if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
            newErrors.quantity = 'Valid quantity is required';
        }

        if (!formData.sku.trim()) {
            newErrors.sku = 'SKU is required';
        }

        if (!formData.lowStockThreshold || isNaN(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0) {
            newErrors.lowStockThreshold = 'Valid low stock threshold is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (validateForm()) {
            setIsSubmitting(true);
            
            try {
                // Create form data for API request
                const apiFormData = new FormData();
                
                // Add all form fields to FormData
                Object.entries(formData).forEach(([key, value]) => {
                    apiFormData.append(key, value);
                });
                
                // Add ID if editing
                if (itemToEdit) {
                    apiFormData.append('id', itemToEdit.id);
                }
                
                // Add image if there is one
                if (imageFile) {
                    apiFormData.append('image', imageFile);
                }
                
                // Get auth token - this assumes you have a function to get the token
                // You might need to adjust this based on your auth implementation
                const accessToken = localStorage.getItem('accessToken');
                
                // Determine URL and method based on whether adding or editing
                const url = itemToEdit 
                    ? `/api/items/${itemToEdit.id}` 
                    : '/api/items';
                    
                const method = itemToEdit ? 'PUT' : 'POST';
                
                // Make API request
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: apiFormData,
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save item');
                }
                
                const savedItem = await response.json();
                
                // Call onSave with the saved item
                onSave(savedItem);
                onClose();
            } catch (error) {
                console.error('Submit error:', error);
                setSubmitError(error.message || 'Failed to save item');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Prevent clicks inside the modal from closing it
    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    // Handle image file selection
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={handleModalClick}>
                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-primary-600">
                        {itemToEdit ? 'Edit Item' : 'Add New Item'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                        aria-label="Close"
                    >
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {submitError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded mx-4 mt-4">
                        {submitError}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="p-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.category ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            >
                                <option value="">Select a category</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                                    Selling Price ($) *
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.price ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                            </div>

                            <div>
                                <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Cost Price ($) *
                                </label>
                                <input
                                    type="number"
                                    id="costPrice"
                                    name="costPrice"
                                    value={formData.costPrice}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.costPrice ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors.costPrice && <p className="mt-1 text-xs text-red-500">{errors.costPrice}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    min="0"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
                            </div>

                            <div>
                                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                                    Low Stock Threshold *
                                </label>
                                <input
                                    type="number"
                                    id="lowStockThreshold"
                                    name="lowStockThreshold"
                                    value={formData.lowStockThreshold}
                                    onChange={handleChange}
                                    min="0"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${errors.lowStockThreshold ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors.lowStockThreshold && <p className="mt-1 text-xs text-red-500">{errors.lowStockThreshold}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                                SKU *
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    id="sku"
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    disabled={autoGenerateSKU}
                                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                                        errors.sku ? 'border-red-500' : 'border-gray-300'
                                    } ${autoGenerateSKU ? 'bg-gray-100' : ''}`}
                                />
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="autoGenerateSKU"
                                        checked={autoGenerateSKU}
                                        onChange={handleSKUToggle}
                                        className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="autoGenerateSKU" className="ml-2 text-sm text-gray-700">
                                        Auto-generate
                                    </label>
                                </div>
                            </div>
                            {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            ></textarea>
                        </div>

                        <div>
                            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                                Product Image
                            </label>
                            <input
                                type="file"
                                id="image"
                                name="image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                            {imageFile && (
                                <p className="mt-1 text-sm text-green-600">
                                    Selected: {imageFile.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : (itemToEdit ? 'Update Item' : 'Add Item')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}