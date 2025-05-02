"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import * as inventoryService from "../app/utils/inventoryService";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import InventoryPage from "./components/InventoryPage";
import Dashboard from "./components/Dashboard";
import Loading from "./components/Loading";

// Define types for your data
interface User {
  uid: string;
  email: string | null;
  getIdToken?: () => Promise<string>;
  // Add other user properties as needed
}

interface InventoryItem {
  lowStockThreshold: number;
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  lastUpdated: string;
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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [activeView, setActiveView] = useState<"inventory" | "dashboard">("inventory");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLowStockAlert, setShowLowStockAlert] = useState<boolean>(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
          const inventoryData = await inventoryService.getInventory();
          setInventory(inventoryData as InventoryItem[]);

          // Find low stock items
          const lowStock = inventoryData.filter(item => 
            item.quantity <= (item.lowStockThreshold || 5)
          );
          setLowStockItems(lowStock as InventoryItem[]);
          
          // Show low stock alert if there are items low in stock
          if (lowStock && lowStock.length > 0) {
            setShowLowStockAlert(true);
          }

          // Load sales data
          const sales = await inventoryService.getSales();
          setSalesData(sales as SaleRecord[]);
        } catch (error) {
          console.error("Error loading data:", error);
          setErrorMessage("Failed to load data. Please refresh the page.");
        } finally {
          setLoading(false);
        }
      }
    }

    loadData();
  }, [user]);

  // Handle selling an item
  const handleSellItem = async (item: InventoryItem, quantity: number) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Create sale object
      const saleData = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity
      };
      
      // Record the sale - this automatically updates inventory quantities
      const saleRecord = await inventoryService.recordSale(saleData, quantity);
      
      // Update local state
      // Add sale to sales data
      setSalesData(prevSales => [...prevSales, saleRecord as SaleRecord]);
      
      // Update inventory item in local state
      const updatedInventory = inventory.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, quantity: Math.max(0, invItem.quantity - quantity) } 
          : invItem
      );
      setInventory(updatedInventory);
      
      // Check if this sale caused the item to reach low stock levels
      const updatedItem = updatedInventory.find(i => i.id === item.id);
      if (updatedItem && updatedItem.quantity <= (updatedItem.lowStockThreshold || 5)) {
        // Check if item is already in low stock list
        if (!lowStockItems.some(i => i.id === item.id)) {
          setLowStockItems(prevLowStock => [...prevLowStock, updatedItem]);
          setShowLowStockAlert(true);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error selling item:", error);
      setErrorMessage(`Failed to process sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        user={user} 
      />
      
      {errorMessage && (
        <div className="fixed top-16 left-0 right-0 mx-auto w-full max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded shadow-md z-50 flex justify-between items-center">
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
      
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
            {lowStockItems.map(item => (
              <li key={item.id}>
                {item.name}: {item.quantity} remaining
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="container mx-auto py-6 px-4">
        {activeView === "inventory" ? (
          <InventoryPage 
            inventory={inventory} 
            setInventory={setInventory} 
            onSellItem={handleSellItem} 
          />
        ) : (
          <Dashboard 
            inventory={inventory} 
            salesData={salesData} 
          />
        )}
      </div>
      
      {loading && <Loading />}
    </div>
  );
}