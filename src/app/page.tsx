"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import { getInventory, getSales, recordSale } from "./utils/dataService";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import InventoryPage from "./components/InventoryPage";
import Dashboard from "./components/Dashboard";
import Loading from "./components/Loading";

// Define types for your data
interface User {
  uid: string;
  email: string | null;
  // Add other user properties as needed
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  // Add other inventory item properties as needed
}

interface SaleRecord {
  id: string;
  itemId: string;
  quantity: number;
  totalPrice: number;
  timestamp: Date;
  // Add other sale record properties as needed
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [activeView, setActiveView] = useState<"inventory" | "dashboard">("inventory");

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
          const inventoryData = await getInventory();
          setInventory(inventoryData as InventoryItem[]);

          // Load sales data
          const sales = await getSales();
          setSalesData(sales as SaleRecord[]);
        } catch (error) {
          console.error("Error loading data:", error);
          alert("Failed to load data. Please refresh the page.");
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
      
      // Record the sale
      const saleRecord = await recordSale(item, quantity) as SaleRecord;
      
      // Update local state
      // Update inventory
      const updatedInventory = inventory.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, quantity: invItem.quantity - quantity } 
          : invItem
      );
      setInventory(updatedInventory);
      
      // Add sale to sales data
      setSalesData([...salesData, saleRecord]);
      
      return true;
    } catch (error) {
      console.error("Error selling item:", error);
      alert("Failed to process sale. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // If still checking auth state
  if (loading) {
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