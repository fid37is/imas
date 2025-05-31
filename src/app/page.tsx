/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from "./firebase/config";
import { toast } from "sonner";
// Import the correct functions from inventoryService
import {
  getInventory,
  getSales,
  recordSale
} from "../app/utils/inventoryService";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import InventoryPage from "./components/InventoryPage";
import Dashboard from "./components/Dashboard";
import OrderManagement from "./components/OrderManagement";
import Loading from "./components/Loading";

// Define types for your data
interface User {
  uid: string;
  email: string | null;
  getIdToken?: () => Promise<string>;
  // Add other user properties as needed
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  sku?: string;
  costPrice?: number;
  lastUpdated?: string;
  lowStockThreshold: number;
  imageUrl?: string;
  imageId?: string;
}

interface SaleRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  timestamp: string;
  userId: string;
}

// Updated interfaces for your Home component
interface ExtendedSaleRecord extends SaleRecord {
  actualPrice?: number; // Actual selling price used
  standardPrice?: number; // Standard/default price
  costPrice?: number;
  profit?: number;
  isDiscounted?: boolean;
  isPremium?: boolean;
}

interface RawInventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  price: number;
  sku?: string;
  costPrice?: number;
  lowStockThreshold: number;
  imageUrl?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesData, setSalesData] = useState<ExtendedSaleRecord[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState<boolean>(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser as User | null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    async function loadData() {
      if (user) {
        setLoading(true);
        try {
          // Load inventory data
          const rawInventoryData = await getInventory();

          // Transform the data to match our InventoryItem interface
          const formattedInventory: InventoryItem[] = rawInventoryData.map((item: RawInventoryItem) => ({
            id: item.id,
            name: item.name,
            category: item.category || 'Uncategorized',
            quantity: item.quantity,
            price: item.price,
            sku: item.sku,
            costPrice: item.costPrice,
            lowStockThreshold: item.lowStockThreshold,
            imageUrl: item.imageUrl,
            lastUpdated: new Date().toISOString()
          }));

          setInventory(formattedInventory);

          // Find low stock items
          const lowStock = formattedInventory.filter(item =>
            item.quantity <= item.lowStockThreshold
          );
          setLowStockItems(lowStock);

          // Show low stock alert if there are items low in stock
          if (lowStock && lowStock.length > 0) {
            setShowLowStockAlert(true);
            toast.warning(`${lowStock.length} item(s) are low in stock!`, {
              description: lowStock.map(item => `${item.name}: ${item.quantity} remaining`).join(', ')
            });
          }

          // Load sales data
          try {
            const sales = await getSales();
            setSalesData(sales as ExtendedSaleRecord[]);
          } catch (error) {
            console.error("Error loading sales data:", error);
            setSalesData([]);
            toast.error("Failed to load sales data");
          }

          toast.success("Data loaded successfully!");
        } catch (error) {
          console.error("Error loading data:", error);
          toast.error("Failed to load data. Please refresh the page.");
        } finally {
          setLoading(false);
        }
      }
    }

    loadData();
  }, [user]);

  // Handle selling an item with proper TypeScript types
  const handleSellItem = async (
    item: InventoryItem,
    quantity: number,
    actualSellingPrice: number
  ): Promise<boolean> => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call recordSale with the correct parameters: item, quantity, customPrice
      //@ts-ignore
      const saleResult = await recordSale(item, quantity, actualSellingPrice);

      // Create new sale record using the result from recordSale
      const newSaleRecord: ExtendedSaleRecord = {
        id: saleResult.id || Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: actualSellingPrice, // Use actual selling price
        totalPrice: actualSellingPrice * quantity, // Calculate total
        actualPrice: actualSellingPrice, // Store the actual selling price
        standardPrice: item.price, // Store the standard price for reference
        costPrice: item.costPrice || 0, // Store cost price
        profit: (actualSellingPrice - (item.costPrice || 0)) * quantity, // Calculate profit
        timestamp: new Date().toISOString(),
        userId: user.uid,
        isDiscounted: actualSellingPrice < item.price, // Check if discounted
        isPremium: actualSellingPrice > item.price // Check if premium pricing
      };

      setSalesData(prevSales => [...prevSales, newSaleRecord]);

      // Update inventory item in local state
      const updatedInventory = inventory.map(invItem =>
        invItem.id === item.id
          ? {
            ...invItem,
            quantity: Math.max(0, invItem.quantity - quantity),
            lastUpdated: new Date().toISOString()
          }
          : invItem
      );
      setInventory(updatedInventory);

      // Check if this sale caused the item to reach low stock levels
      const updatedItemInState = updatedInventory.find(i => i.id === item.id);
      if (updatedItemInState && updatedItemInState.lowStockThreshold &&
        updatedItemInState.quantity <= updatedItemInState.lowStockThreshold) {
        if (!lowStockItems.some(i => i.id === item.id)) {
          setLowStockItems(prevLowStock => [...prevLowStock, updatedItemInState]);
          setShowLowStockAlert(true);
          toast.warning(`${item.name} is now low in stock!`, {
            description: `Only ${updatedItemInState.quantity} remaining`
          });
        }
      }

      // Show success message with actual selling price
      const actualPriceText = actualSellingPrice !== item.price
        ? ` at ₦${actualSellingPrice.toFixed(2)} each`
        : '';

      const totalPrice = actualSellingPrice * quantity;
      const profit = (actualSellingPrice - (item.costPrice || 0)) * quantity;

      toast.success(`Sale recorded: ${quantity}x ${item.name}${actualPriceText}`, {
        description: `Total: ₦${totalPrice.toFixed(2)} | Profit: ₦${profit.toFixed(2)}`
      });

      return true;
    } catch (error) {
      console.error("Error selling item:", error);
      toast.error(`Failed to process sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // If still checking auth state
  if (loading && !user) {
    return <Loading />;
  }

  // If not authenticated, show login
  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />

        {showLowStockAlert && lowStockItems.length > 0 && (
          <div className="fixed top-16 right-0 m-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded shadow-md z-40 max-w-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Low Stock Alert</h3>
              <button
                onClick={() => setShowLowStockAlert(false)}
                className="text-yellow-700 hover:text-yellow-900"
              >
                ×
              </button>
            </div>
            <p className="mb-2">The following items need restocking:</p>
            <ul className="list-disc pl-5">
              {lowStockItems.map((item) => (
                <li key={item.id}>
                  {item.name}: {item.quantity} remaining
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="container mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  salesData={salesData}
                  inventory={inventory}
                />
              }
            />
            <Route
              path="/inventory"
              element={
                <InventoryPage
                  inventory={inventory}
                  setInventory={setInventory}
                  onSellItem={handleSellItem}
                />
              }
            />
            <Route
              path="/orders"
              element={
                <OrderManagement />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}