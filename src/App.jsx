import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AppShell from './components/AppShell';
import Home from './pages/Home';
import Auth from './pages/Auth';
import NewOnboarding from './pages/NewOnboarding';
import Onboarding from './pages/Onboarding';
import Records from './pages/Records';
import RecordDetail from './pages/RecordDetail';
import Event from './pages/Event';
import People from './pages/People';
import ProfileDetail from './pages/ProfileDetail';
import MyProfile from './pages/MyProfile';
import Chat from './pages/Chat';

// This custom hook will be the single source of truth for the user's progress
function useUserStatus() {
  const [status, setStatus] = useState({
    isLoggedIn: false,
    onboardingComplete: false,
    hasRSVP: false,
    hasUploadedRecord: false,
    loading: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isLoggedIn = !!session?.user;

      if (!isLoggedIn) {
        setStatus({ isLoggedIn: false, onboardingComplete: false, hasRSVP: false, hasUploadedRecord: false, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, has_rsvped, has_uploaded_record')
        .eq('id', session.user.id)
        .maybeSingle();

      setStatus({
        isLoggedIn: true,
        onboardingComplete: profile?.onboarding_completed === true,
        hasRSVP: profile?.has_rsvped === true,
        hasUploadedRecord: profile?.has_uploaded_record === true,
        loading: false,
      });
    };

    checkStatus();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(checkStatus);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return status;
}

function ProtectedRoute({ children }) {
  const status = useUserStatus();
  const location = useLocation();

  if (status.loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  // Gating logic based on the user's progress
  if (!status.isLoggedIn) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (!status.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Gating for RSVP and Vinyl upload
  const vinylGatedRoutes = ['/people', '/chat'];
  const rsvpGatedRoutes = ['/records', '/me'];

  if (vinylGatedRoutes.some(path => location.pathname.startsWith(path))) {
    if (!status.hasRSVP) {
        return <Navigate to="/event" replace />;
    }
    if (!status.hasUploadedRecord) {
        return <Navigate to="/records" replace />;
    }
  } else if (rsvpGatedRoutes.some(path => location.pathname.startsWith(path))) {
    if (!status.hasRSVP) {
        return <Navigate to="/event" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/event" element={<Event />} />

        {/* Redirect old auth routes */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth" replace />} />

        {/* Protected Routes - The single ProtectedRoute component handles all gating */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<NewOnboarding />} />
          <Route path="/music-preferences" element={<Onboarding />} />
          <Route path="/me" element={<MyProfile />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<ProfileDetail />} />
          <Route path="/chat/:id" element={<Chat />} />
        </Route>
      </Routes>
    </AppShell>
  );
}
