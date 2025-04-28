"use client"
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import InventoryPage from './components/InventoryPage';
import Login from './components/Login';
import Loading from './components/Loading';
import { fetchInventory, saveSale } from './utils/dataService';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('inventory'); // 'dashboard' or 'inventory'
  const [inventory, setInventory] = useState([]);
  const [salesData, setSalesData] = useState([]);
  
  // Auth state monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Fetch inventory data
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchInventory()
        .then(data => {
          setInventory(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching inventory:", error);
          setLoading(false);
        });
    }
  }, [user]);

  // Handle selling an item
  const handleSellItem = async (item, quantity) => {
    try {
      // Create a sale record
      const sale = {
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        price: item.price,
        costPrice: item.costPrice,
        total: item.price * quantity,
        profit: (item.price - item.costPrice) * quantity,
        date: new Date().toISOString()
      };
      
      // Update inventory qty
      const updatedItem = {
        ...item,
        quantity: item.quantity - quantity
      };
      
      // Update state
      const updatedInventory = inventory.map(inventoryItem => 
        inventoryItem.id === item.id ? updatedItem : inventoryItem
      );
      
      setInventory(updatedInventory);
      
      // Save to backend
      await saveSale(sale, updatedItem);
      
      // Add to sales data for dashboard
      setSalesData([...salesData, sale]);
      
    } catch (error) {
      console.error("Error processing sale:", error);
      alert("Failed to process sale. Please try again.");
    }
  };

  if (loading) return <Loading />;
  
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-100" style={{ backgroundColor: "#EFF1F3" }}>
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView}
        user={user}
      />
      
      <main className="container mx-auto px-4 py-6">
        {activeView === 'dashboard' ? (
          <Dashboard 
            inventory={inventory}
            salesData={salesData}
          />
        ) : (
          <InventoryPage 
            inventory={inventory}
            setInventory={setInventory}
            onSellItem={handleSellItem}
          />
        )}
      </main>
    </div>
  );
}