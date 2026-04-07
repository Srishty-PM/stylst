import { useEffect, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

// Eagerly load landing & auth (critical path)
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";

// Lazy load everything else
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Closet = lazy(() => import("@/pages/Closet"));
const AddClosetItem = lazy(() => import("@/pages/closet/AddClosetItem"));
const ClosetItemDetail = lazy(() => import("@/pages/closet/ClosetItemDetail"));
const Inspiration = lazy(() => import("@/pages/Inspiration"));
const AddInspiration = lazy(() => import("@/pages/inspiration/AddInspiration"));
const InspirationDetail = lazy(() => import("@/pages/inspiration/InspirationDetail"));
const MatchBuilder = lazy(() => import("@/pages/MatchBuilder"));
const Looks = lazy(() => import("@/pages/Looks"));
const LookDetail = lazy(() => import("@/pages/looks/LookDetail"));
const AIStylist = lazy(() => import("@/pages/AIStylist"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Settings = lazy(() => import("@/pages/Settings"));
const InfluencerStyles = lazy(() => import("@/pages/influencer-styles/InfluencerStyles"));
const AddInfluencerStyle = lazy(() => import("@/pages/influencer-styles/AddInfluencerStyle"));
const InfluencerStyleDetail = lazy(() => import("@/pages/influencer-styles/InfluencerStyleDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Trips = lazy(() => import("./pages/trips/Trips"));
const NewTrip = lazy(() => import("./pages/trips/NewTrip"));
const TripDetail = lazy(() => import("./pages/trips/TripDetail"));
const Install = lazy(() => import("./pages/Install"));
const Privacy = lazy(() => import("./pages/Privacy"));
const PinterestCallback = lazy(() => import("./pages/PinterestCallback"));
const StyleMyItem = lazy(() => import("./pages/StyleMyItem"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const OnboardingRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return children ? <>{children}</> : <Onboarding />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  if (user && profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const MatchRedirect = () => {
  const { inspirationId } = useParams();
  return <Navigate to={inspirationId ? `/inspiration/${inspirationId}` : '/inspiration'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
    <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/auth/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/onboarding" element={<OnboardingRoute />} />
    <Route path="/onboarding/*" element={<OnboardingRoute />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/closet" element={<ProtectedRoute><Closet /></ProtectedRoute>} />
    <Route path="/closet/add" element={<ProtectedRoute><AddClosetItem /></ProtectedRoute>} />
    <Route path="/closet/:itemId" element={<ProtectedRoute><ClosetItemDetail /></ProtectedRoute>} />
    <Route path="/inspiration" element={<ProtectedRoute><Inspiration /></ProtectedRoute>} />
    <Route path="/inspiration/add" element={<ProtectedRoute><AddInspiration /></ProtectedRoute>} />
    <Route path="/inspiration/:inspirationId" element={<ProtectedRoute><InspirationDetail /></ProtectedRoute>} />
    <Route path="/match" element={<Navigate to="/inspiration" replace />} />
    <Route path="/match/:inspirationId" element={<MatchRedirect />} />
    <Route path="/looks" element={<ProtectedRoute><Looks /></ProtectedRoute>} />
    <Route path="/looks/:lookId" element={<ProtectedRoute><LookDetail /></ProtectedRoute>} />
    <Route path="/ai-stylist" element={<ProtectedRoute><AIStylist /></ProtectedRoute>} />
    <Route path="/style-my-item" element={<ProtectedRoute><StyleMyItem /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
    <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
    <Route path="/trips/new" element={<ProtectedRoute><NewTrip /></ProtectedRoute>} />
    <Route path="/trips/:tripId" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/settings/influencer-styles" element={<ProtectedRoute><InfluencerStyles /></ProtectedRoute>} />
    <Route path="/settings/influencer-styles/add" element={<ProtectedRoute><AddInfluencerStyle /></ProtectedRoute>} />
    <Route path="/settings/influencer-styles/:id" element={<ProtectedRoute><InfluencerStyleDetail /></ProtectedRoute>} />
    <Route path="/install" element={<Install />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/pinterest-callback" element={<ProtectedRoute><PinterestCallback /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#F5F0EC' });
      SplashScreen.hide();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <AppRoutes />
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
