import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Closet from "@/pages/Closet";
import AddClosetItem from "@/pages/closet/AddClosetItem";
import ClosetItemDetail from "@/pages/closet/ClosetItemDetail";
import Inspiration from "@/pages/Inspiration";
import AddInspiration from "@/pages/inspiration/AddInspiration";
import MatchBuilder from "@/pages/MatchBuilder";
import Looks from "@/pages/Looks";
import LookDetail from "@/pages/looks/LookDetail";
import AIStylist from "@/pages/AIStylist";
import Calendar from "@/pages/Calendar";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const OnboardingRoute = () => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
    <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/auth/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/onboarding" element={<OnboardingRoute />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/closet" element={<ProtectedRoute><Closet /></ProtectedRoute>} />
    <Route path="/closet/add" element={<ProtectedRoute><AddClosetItem /></ProtectedRoute>} />
    <Route path="/closet/:itemId" element={<ProtectedRoute><ClosetItemDetail /></ProtectedRoute>} />
    <Route path="/inspiration" element={<ProtectedRoute><Inspiration /></ProtectedRoute>} />
    <Route path="/inspiration/add" element={<ProtectedRoute><AddInspiration /></ProtectedRoute>} />
    <Route path="/match" element={<ProtectedRoute><MatchBuilder /></ProtectedRoute>} />
    <Route path="/match/:inspirationId" element={<ProtectedRoute><MatchBuilder /></ProtectedRoute>} />
    <Route path="/looks" element={<ProtectedRoute><Looks /></ProtectedRoute>} />
    <Route path="/looks/:lookId" element={<ProtectedRoute><LookDetail /></ProtectedRoute>} />
    <Route path="/ai-stylist" element={<ProtectedRoute><AIStylist /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/install" element={<Install />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
