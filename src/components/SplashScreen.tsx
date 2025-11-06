import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  checkingAuth?: boolean;
}

export function SplashScreen({ onComplete, checkingAuth = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<"hidden" | "fadeIn" | "visible" | "fadeOut">("hidden");

  useEffect(() => {
    // Begin fade in
    const t1 = setTimeout(() => setPhase("fadeIn"), 100);
    // Fully visible
    const t2 = setTimeout(() => setPhase("visible"), 600);

    if (!checkingAuth) {
      // Fade out faster for clean transition
      const t3 = setTimeout(() => setPhase("fadeOut"), 1900);
      const t4 = setTimeout(() => onComplete(), 2600);
      return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }

    return () => [t1, t2].forEach(clearTimeout);
  }, [onComplete, checkingAuth]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] 
        bg-gradient-to-br from-[#0B0C10] via-[#11131c] to-[#0B0C10]
        ${
          phase === "fadeIn"
            ? "opacity-100 scale-100"
            : phase === "visible"
            ? "opacity-100 scale-100"
            : phase === "fadeOut"
            ? "opacity-0 scale-105"
            : "opacity-0 scale-95"
        }`}
    >
      {/* Soft animated glow in background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-[100px] animate-pulse-slow animation-delay-2000" />
      </div>

      {/* Logo text */}
      <div
        className={`text-center space-y-4 transform transition-all duration-700 ${
          phase === "fadeIn" || phase === "visible"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        <h1 className="text-6xl font-extrabold tracking-tight">
          <span className="text-white">vyb</span>
          <span className="text-[#00BFFF] animate-gradient-x bg-clip-text text-transparent bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5]">
            in
          </span>
        </h1>
        <p className="text-gray-400 text-lg font-medium animate-fadeIn">
          Discover. Connect. Vybe.
        </p>
      </div>
    </div>
  );
}
