import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import ListingDetail from "./pages/ListingDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import CreateListing from "./pages/CreateListing";
import MyListings from "./pages/MyListings";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Safety from "./pages/Safety";
import Rules from "./pages/Rules";
import VIP from "./pages/VIP";
import NotFound from "./pages/NotFound";
import SellerProfile from "./pages/SellerProfile";
import Favorites from "./pages/Favorites";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Messages from "./pages/Messages";
import TrustBadges from "./pages/TrustBadges";
import PointsShop from "./pages/PointsShop";


const queryClient = new QueryClient({});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/create" element={<CreateListing />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/vip" element={<VIP />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/trust-badges" element={<TrustBadges />} />
                  <Route path="/points" element={<PointsShop />} />
                  
                  <Route path="/seller/:id" element={<SellerProfile />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
