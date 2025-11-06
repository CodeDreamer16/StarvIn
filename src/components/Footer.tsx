import { Mail, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full mt-12 border-t border-white/10 bg-[#0B0C10]/90 backdrop-blur-sm text-center py-10 text-gray-400">
      <h2 className="text-lg font-semibold text-white mb-4">Get in Touch</h2>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#4C6EF5]" />
          <span className="text-gray-300">contact@vybin.org</span>
        </div>
        <div className="flex items-center gap-2">
          <Instagram className="w-4 h-4 text-[#A78BFA]" />
          <span className="text-gray-300">@vybin</span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        © {new Date().getFullYear()} <span className="text-white font-semibold">Vybin</span>.  
        Connecting McGill students through shared experiences.
      </p>

      <div className="flex justify-center gap-4 mt-2 text-xs">
        <a href="#" className="hover:text-[#4C6EF5] transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-[#7C3AED] transition-colors">Privacy Policy</a>
      </div>
    </footer>
  );
}
