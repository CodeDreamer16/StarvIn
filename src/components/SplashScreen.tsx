import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  checkingAuth?: boolean;
}

export function SplashScreen({ onComplete, checkingAuth = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<"hidden" | "fadeIn" | "visible" | "fadeOut">("hidden");
  const [wordVisibility, setWordVisibility] = useState([false, false, false]);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Fade-in entry
    timers.push(setTimeout(() => setPhase("fadeIn"), 100));
    timers.push(setTimeout(() => setPhase("visible"), 600));

    // Tagline reveals
    timers.push(setTimeout(() => setWordVisibility([true, false, false]), 1000)); // Discover
    timers.push(setTimeout(() => setWordVisibility([true, true, false]), 1500)); // Connect
    timers.push(setTimeout(() => setWordVisibility([true, true, true]), 2000)); // Vybe

    // 🕒 Extended duration for full display (fade out later)
    if (!checkingAuth) {
      timers.push(setTimeout(() => setPhase("fadeOut"), 9000));  // start fade-out at 9s
      timers.push(setTimeout(() => onComplete(), 10500));        // finish + move to login at 10.5s
    }

    return () => timers.forEach(clearTimeout);
  }, [onComplete, checkingAuth]);

  // Subtle mouse-follow glow
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,191,255,0.15), transparent 65%)`;
    }
  }, [mousePos]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-[1500ms] ease-[cubic-bezier(0.4,0,0.2,1)]
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
      {/* Glow background */}
      <div
        ref={glowRef}
        className="absolute inset-0 transition-all duration-700 ease-in-out pointer-events-none"
      />

      {/* Floating gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-10 blur-[120px] animate-blob" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      {/* Branding */}
      <div
        className={`text-center transform transition-all duration-700 ${
          phase === "fadeIn" || phase === "visible"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        <h1 className="text-6xl font-extrabold tracking-tight mb-4">
          <span className="text-white">vyb</span>
          <span className="text-[#00BFFF] bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent animate-gradient-x">
            in
          </span>
        </h1>

        {/* Inline tagline */}
        <p className="text-gray-400 text-lg font-medium">
          <span
            className={`transition-all duration-700 ${
              wordVisibility[0] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            Discover.
          </span>{" "}
          <span
            className={`transition-all duration-700 ${
              wordVisibility[1] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            Connect.
          </span>{" "}
          <span
            className={`transition-all duration-700 ${
              wordVisibility[2] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            Vybe.
          </span>
        </p>
      </div>
    </div>
  );
}
