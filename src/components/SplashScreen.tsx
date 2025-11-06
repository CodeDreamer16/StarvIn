import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  checkingAuth?: boolean;
}

export function SplashScreen({ onComplete, checkingAuth = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<"hidden" | "fadeIn" | "visible" | "fadeOut">("hidden");
  const [activeWord, setActiveWord] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const glowRef = useRef<HTMLDivElement>(null);

  // Fade sequence + completion
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fadeIn"), 100);
    const t2 = setTimeout(() => setPhase("visible"), 600);

    // Word animation: Discover → Connect → Vybe
    const wordsTiming = [1000, 1800, 2600];
    wordsTiming.forEach((time, idx) =>
      setTimeout(() => setActiveWord(idx), time)
    );

    if (!checkingAuth) {
      const t3 = setTimeout(() => setPhase("fadeOut"), 3400);
      const t4 = setTimeout(() => onComplete(), 4100);
      return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }

    return () => [t1, t2].forEach(clearTimeout);
  }, [onComplete, checkingAuth]);

  // Track mouse movement for glow shift
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Update glow position
  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,191,255,0.18), transparent 65%)`;
    }
  }, [mousePos]);

  const taglineWords = ["Discover", "Connect", "Vybe"];

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
      {/* Reactive Glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 transition-all duration-700 ease-in-out pointer-events-none"
      />

      {/* Idle Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-10 blur-[120px] animate-blob" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      {/* Logo + Tagline */}
      <div
        className={`text-center transform transition-all duration-700 ${
          phase === "fadeIn" || phase === "visible"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        <h1 className="text-6xl font-extrabold tracking-tight group relative inline-block transition-all duration-700">
          <span className="text-white">vyb</span>
          <span className="text-[#00BFFF] bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent animate-gradient-x group-hover:brightness-125 group-hover:drop-shadow-[0_0_25px_rgba(0,191,255,0.6)] transition-all duration-700">
            in
          </span>
        </h1>

        {/* Animated Tagline */}
        <div className="mt-4 flex items-center justify-center h-8">
          {taglineWords.map((word, idx) => (
            <span
              key={idx}
              className={`absolute text-gray-400 text-lg font-medium transition-all duration-500 ${
                idx === activeWord
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              {word}.
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
