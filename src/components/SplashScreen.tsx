import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  checkingAuth?: boolean;
}

export function SplashScreen({ onComplete, checkingAuth = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<"hidden" | "fadeIn" | "visible" | "fadeOut">("hidden");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const glowRef = useRef<HTMLDivElement>(null);

  // Fade timing logic
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fadeIn"), 100);
    const t2 = setTimeout(() => setPhase("visible"), 600);

    if (!checkingAuth) {
      const t3 = setTimeout(() => setPhase("fadeOut"), 2100);
      const t4 = setTimeout(() => onComplete(), 2800);
      return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }

    return () => [t1, t2].forEach(clearTimeout);
  }, [onComplete, checkingAuth]);

  // Track mouse movement to move background glow
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Update background glow position
  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,191,255,0.15), transparent 60%)`;
    }
  }, [mousePos]);

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
      {/* Background glow that follows mouse */}
      <div
        ref={glowRef}
        className="absolute inset-0 transition-all duration-700 ease-in-out pointer-events-none"
      />

      {/* Idle animated blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-10 blur-[120px] animate-blob" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      {/* Center content */}
      <div
        className={`text-center space-y-4 transform transition-all duration-700 ${
          phase === "fadeIn" || phase === "visible"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        <h1
          className="text-6xl font-extrabold tracking-tight group relative inline-block cursor-default transition-all duration-700"
        >
          <span className="text-white">vyb</span>
          <span className="text-[#00BFFF] bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent animate-gradient-x group-hover:brightness-125 group-hover:drop-shadow-[0_0_25px_rgba(0,191,255,0.6)] transition-all duration-700">
            in
          </span>
        </h1>
        <p className="text-gray-400 text-lg font-medium animate-fadeIn">Discover. Connect. Vybe.</p>
      </div>
    </div>
  );
}
