import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomNav } from './components/BottomNav';
import { FeedTab } from './components/FeedTab';
import { ApplicationsTab } from './components/ApplicationsTab';
import { ProfileTab } from './components/ProfileTab';
import { supabase } from './lib/supabase';

type Tab = 'feed' | 'applications' | 'profile';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  useEffect(() => {
    if (user && !showSplash) {
      checkOnboardingStatus();
    } else if (!user) {
      setIsOnboarded(false);
      setFadeIn(false);
      setTimeout(() => setFadeIn(true), 50);
    }
  }, [user, showSplash]);

  useEffect(() => {
    if (!showSplash && !authLoading && !checkingOnboarding) {
      const timer = setTimeout(() => {
        setFadeIn(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSplash, authLoading, checkingOnboarding]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    setCheckingOnboarding(true);

    // Helper function to check profile with retry logic for new Google sign-ins
    const checkProfileWithRetry = async (retries = 3, delay = 500): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        const { data: existingProfile, error } = await supabase
          .from('profiles')
          .select('id, onboarded')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          if (i === retries - 1) return null;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If profile exists, return it
        if (existingProfile) {
          return existingProfile;
        }

        // Profile doesn't exist yet, wait and retry (for new Google OAuth users)
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    try {
      const existingProfile = await checkProfileWithRetry();

      // If profile exists and user has completed onboarding, go to feed
      if (existingProfile && existingProfile.onboarded === true) {
        setIsOnboarded(true);
      } else {
        // Profile doesn't exist yet or onboarding not completed - show interests page
        setIsOnboarded(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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

  return (
    <div className="relative min-h-screen bg-[#0B0C10]">
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} checkingAuth={authLoading} />
      ) : (
        <>
          {checkingOnboarding ? (
            <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center transition-opacity duration-500">
              <div className="text-white">Loading...</div>
            </div>
          ) : !user ? (
            <div className={`transition-all duration-500 ease-out ${
              fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <LoginScreen />
            </div>
          ) : !isOnboarded ? (
            <div className={`transition-all duration-500 ease-out ${
              fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <OnboardingScreen onComplete={handleOnboardingComplete} />
            </div>
          ) : (
            <div className={`min-h-screen bg-[#0B0C10] flex flex-col transition-all duration-500 ease-out ${
              fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'feed' && <FeedTab />}
                {activeTab === 'applications' && <ApplicationsTab />}
                {activeTab === 'profile' && <ProfileTab />}
              </div>
              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}
        </>
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
