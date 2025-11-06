import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomNav } from './components/BottomNav';
import { FeedTab } from './components/FeedTab';
import { ApplicationsTab } from './components/ApplicationsTab';
import { ProfileTab } from './components/ProfileTab';
import { SavedTab } from './components/SavedTab';
import { supabase } from './lib/supabase';

type Tab = 'feed' | 'applications' | 'saved' | 'profile';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => setShowSplash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  useEffect(() => {
    if (user && !showSplash) checkOnboardingStatus();
    else if (!user) {
      setIsOnboarded(false);
      setFadeIn(false);
      setTimeout(() => setFadeIn(true), 50);
    }
  }, [user, showSplash]);

  useEffect(() => {
    if (!showSplash && !authLoading && !checkingOnboarding) {
      const timer = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [showSplash, authLoading, checkingOnboarding]);

  const checkOnboardingStatus = async () => {
    if (!user) return;
    setCheckingOnboarding(true);

    const checkProfileWithRetry = async (retries = 3, delay = 500) => {
      for (let i = 0; i < retries; i++) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, onboarded')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          if (i === retries - 1) return null;
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        if (profile) return profile;
        if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
      }
      return null;
    };

    try {
      const profile = await checkProfileWithRetry();
      setIsOnboarded(profile?.onboarded === true);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setIsOnboarded(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIsOnboarded(true);
      setTimeout(() => setFadeIn(true), 50);
    }, 300);
  };

  const handleEditPreferences = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ onboarded: false }).eq('id', user.id);
      setFadeIn(false);
      setTimeout(() => {
        setIsOnboarded(false);
        setTimeout(() => setFadeIn(true), 50);
      }, 300);
    } catch (err) {
      console.error('Error updating onboarding status:', err);
    }
  };

  return (
    <div className="relative h-screen bg-[#0B0C10] flex flex-col">
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} checkingAuth={authLoading} />
      ) : checkingOnboarding ? (
        <div className="flex-1 flex items-center justify-center text-white">Loading...</div>
      ) : !user ? (
        <div
          className={`transition-all duration-500 ${
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <LoginScreen />
        </div>
      ) : !isOnboarded ? (
        <div
          className={`transition-all duration-500 ${
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </div>
      ) : (
        <div
          className={`relative flex-1 overflow-hidden transition-all duration-500 ${
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Scrollable Content */}
          <div className="overflow-y-auto h-full pb-32">
            {activeTab === 'feed' && <FeedTab />}
            {activeTab === 'applications' && <ApplicationsTab />}
            {activeTab === 'saved' && <SavedTab />}
            {activeTab === 'profile' && (
              <ProfileTab onEditPreferences={handleEditPreferences} />
            )}
          </div>

          {/* Fixed Bottom Nav */}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
