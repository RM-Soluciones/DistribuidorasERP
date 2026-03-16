import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";

import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import Cart from "./pages/public/Cart";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import CustomerDashboard from "./pages/customer/Dashboard";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCategories from "./pages/admin/Categories";
import AdminUsers from "./pages/admin/Users";
import AdminClients from "./pages/admin/Clients";
import AdminSettings from "./pages/admin/Settings";
import AdminDiscounts from "./pages/admin/Discounts";
import AdminOffers from "./pages/admin/Offers";
import AdminPOS from "./pages/admin/POS";
import AdminInvoice from "./pages/admin/Invoice";
import AdminCashRegister from "./pages/admin/CashRegister";
import AdminSuppliers from "./pages/admin/Suppliers";
import SupplierDetail from "./pages/admin/SupplierDetail";
import AdminPurchases from "./pages/admin/Purchases";
import AdminPaymentMethods from "./pages/admin/PaymentMethods";

import SellerOrders from "./pages/seller/Orders";
import DeliveryDashboard from "./pages/delivery/Deliveries";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/customer/cart" component={Cart} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/customer/dashboard" component={CustomerDashboard} />
      <Route path="/seller" component={SellerOrders} />
      <Route path="/delivery" component={DeliveryDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/pos" component={AdminPOS} />
      <Route path="/admin/invoice/:id" component={AdminInvoice} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/cash-register" component={AdminCashRegister} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/discounts" component={AdminDiscounts} />
      <Route path="/admin/offers" component={AdminOffers} />
      <Route path="/admin/suppliers/:id" component={SupplierDetail} />
      <Route path="/admin/suppliers" component={AdminSuppliers} />
      <Route path="/admin/purchases" component={AdminPurchases} />
      <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
      <Route path="/admin/clients" component={AdminClients} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
