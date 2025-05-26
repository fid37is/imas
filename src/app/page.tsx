"use client";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
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

// Define SaleData interface to fix the TypeScript error
interface SaleData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  costPrice: number;
  sku: string;
}

// Order interfaces
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled';
  total: number;
  items: OrderItem[];
  shippingAddress: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  trackingNumber?: string;
  userId: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [activeView, setActiveView] = useState<"inventory" | "dashboard" | "orders">("inventory");
  const [showLowStockAlert, setShowLowStockAlert] = useState<boolean>(false);

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
            setSalesData(sales as SaleRecord[]);
          } catch (error) {
            console.error("Error loading sales data:", error);
            setSalesData([]);
            toast.error("Failed to load sales data");
          }

          // Load orders data (you'll need to implement getOrders in your service)
          try {
            // For now, using sample data - replace with actual API call
            const sampleOrders: Order[] = [
              {
                id: 'ORD-001',
                orderId: 'ORD-001',
                customerName: 'John Smith',
                customerEmail: 'john@example.com',
                orderDate: '2024-01-15',
                status: 'pending',
                total: 299.99,
                items: [
                  { name: 'Wireless Headphones', quantity: 1, price: 199.99 },
                  { name: 'Phone Case', quantity: 2, price: 50.00 }
                ],
                shippingAddress: '123 Main St, City, State 12345',
                paymentStatus: 'paid',
                notes: 'Please handle with care',
                trackingNumber: '',
                userId: user.uid
              }
            ];
            setOrders(sampleOrders);
          } catch (error) {
            console.error("Error loading orders:", error);
            setOrders([]);
            toast.error("Failed to load orders");
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

  // Handle selling an item
  const handleSellItem = async (item: InventoryItem, quantity: number) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Create sale object with proper typing
      const saleData: SaleData = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        costPrice: item.costPrice || 0,
        sku: item.sku || ''
      };
      
      // Record the sale - this automatically updates inventory quantities
      await recordSale(saleData, quantity);
      
      // Update local state
      const newSaleRecord: SaleRecord = {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: item.price,
        totalPrice: item.price * quantity,
        timestamp: new Date().toISOString(),
        userId: user.uid
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
      if (updatedItemInState && updatedItemInState.quantity <= updatedItemInState.lowStockThreshold) {
        if (!lowStockItems.some(i => i.id === item.id)) {
          setLowStockItems(prevLowStock => [...prevLowStock, updatedItemInState]);
          setShowLowStockAlert(true);
          toast.warning(`${item.name} is now low in stock!`, {
            description: `Only ${updatedItemInState.quantity} remaining`
          });
        }
      }
      
      toast.success(`Sale recorded: ${quantity}x ${item.name}`, {
        description: `Total: $${(item.price * quantity).toFixed(2)}`
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

  // Handle order status updates
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status'], trackingNumber?: string) => {
    try {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, trackingNumber: trackingNumber || order.trackingNumber }
            : order
        )
      );

      // Here you would make API call to update status
      // await updateOrderStatus(orderId, newStatus, trackingNumber);

      toast.success(`Order ${orderId} status updated to ${newStatus}`);
      
      // If marking as fulfilled, update inventory
      if (newStatus === 'fulfilled') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // Update inventory quantities based on order items
          const updatedInventory = inventory.map(invItem => {
            const orderItem = order.items.find(item => 
              item.name === invItem.name || item.sku === invItem.sku
            );
            if (orderItem) {
              return {
                ...invItem,
                quantity: Math.max(0, invItem.quantity - orderItem.quantity),
                lastUpdated: new Date().toISOString()
              };
            }
            return invItem;
          });
          setInventory(updatedInventory);
          
          toast.info("Inventory updated based on fulfilled order");
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Handle resending confirmation emails
  const handleResendEmail = async (order: Order) => {
    try {
      // API call to resend email would go here
      console.log(`Resending confirmation email for order ${order.orderId}`);
      toast.success('Confirmation email sent successfully!');
    } catch (error) {
      console.error('Failed to resend email:', error);
      toast.error('Failed to send email. Please try again.');
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
        {activeView === "inventory" && (
          <InventoryPage 
            inventory={inventory}
            setInventory={setInventory}
            onSellItem={handleSellItem}
          />
        )}
        
        {activeView === "dashboard" && (
          <Dashboard 
            salesData={salesData} 
            inventory={inventory}
          />
        )}

        {activeView === "orders" && (
          <OrderManagement 
            orders={orders}
            setOrders={setOrders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onResendEmail={handleResendEmail}
            inventory={inventory}
          />
        )}
      </div>
    </div>
  );
}