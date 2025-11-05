import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  checkingAuth?: boolean;
}

export function SplashScreen({ onComplete, checkingAuth = false }: SplashScreenProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeInTimer = setTimeout(() => {
      setFadeIn(true);
    }, 100);

    if (!checkingAuth) {
      const fadeOutTimer = setTimeout(() => {
        setFadeOut(true);
      }, 2000);

      const completeTimer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(fadeOutTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(fadeInTimer);
    };
  }, [onComplete, checkingAuth]);

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-[#0B0C10] via-[#1a1d29] to-[#0B0C10] flex items-center justify-center z-50 transition-opacity duration-1000 ${
        fadeOut ? 'opacity-0' : fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center space-y-6">
        <div className="text-6xl font-bold animate-pulse">
          <span className="text-white">vyb</span>
          <span className="text-[#00BFFF]">in</span>
        </div>
        <p className="text-gray-400 text-lg">Keep vybin & Stay Informed.</p>
      </div>
    </div>
  );
}
