"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import { 
  getItems, 
  getLowStock,
  recordSale 
} from "../app/utils/inventoryService";

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
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  imageId?: string;
  // Add other inventory item properties as needed
}

interface SaleRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  timestamp?: Date;
  // Add other sale record properties as needed
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
          // Get access token from the user if needed for inventory service
          const accessToken = await user.getIdToken?.() || "";
          
          // Load inventory data - using getItems instead of getInventory
          const inventoryData = await getItems(accessToken);
          setInventory(inventoryData as InventoryItem[]);

          // Check for low stock items
          const lowStockData = await getLowStock(accessToken);
          setLowStockItems(lowStockData as InventoryItem[]);
          
          // Show low stock alert if there are items low in stock
          if (lowStockData && lowStockData.length > 0) {
            setShowLowStockAlert(true);
          }

          // Note: The refactored service doesn't appear to have a direct getSales function
          // You might need to implement this or modify this part based on your needs
          // Placeholder for now - you'll need to add the proper implementation
          // const sales = await getSales(accessToken);
          // setSalesData(sales as SaleRecord[]);
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
      
      // Get access token if needed
      const accessToken = await user?.getIdToken?.() || "";
      
      // Create sale object based on what recordSale expects
      const saleData = {
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        price: item.price
      };
      
      // Record the sale - this matches the new service function signature
      const saleRecord = await recordSale(saleData, accessToken) as SaleRecord;
      
      // Update local state
      // Update inventory
      const updatedInventory = inventory.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, quantity: Math.max(0, invItem.quantity - quantity) } 
          : invItem
      );
      setInventory(updatedInventory);
      
      // Add sale to sales data
      setSalesData([...salesData, saleRecord]);
      
      // Check if this sale caused the item to reach low stock levels
      const updatedItem = updatedInventory.find(i => i.id === item.id);
      if (updatedItem && updatedItem.quantity <= 5) { // Assuming 5 is the threshold for low stock
        // Check if item is already in low stock list
        if (!lowStockItems.some(i => i.id === item.id)) {
          setLowStockItems([...lowStockItems, updatedItem]);
          setShowLowStockAlert(true);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error selling item:", error);
      setErrorMessage("Failed to process sale. Please try again.");
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