import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, FileText, Bookmark, Star, Mail, Instagram } from 'lucide-react';

interface ProfileTabProps {
  onEditPreferences: () => void;
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white pb-28 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4C6EF5] via-[#7C3AED] to-[#9F7AEA] p-8 rounded-b-3xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end justify-between z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-[#1a1d29] rounded-full flex items-center justify-center text-3xl font-bold">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.user_metadata?.full_name || 'User'}</h1>
                <p className="text-gray-200 text-sm">{user?.email}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Member since{' '}
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={onEditPreferences}
              className="mt-6 sm:mt-0 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all"
            >
              <Settings className="w-4 h-4" /> Edit Preferences
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 px-6 mt-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center hover:bg-white/10 transition-all shadow-inner">
            <FileText className="w-6 h-6 mx-auto mb-2 text-[#4C6EF5]" />
            <h3 className="text-lg font-semibold">4</h3>
            <p className="text-gray-400 text-xs">Applications</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center hover:bg-white/10 transition-all shadow-inner">
            <Bookmark className="w-6 h-6 mx-auto mb-2 text-[#A78BFA]" />
            <h3 className="text-lg font-semibold">0</h3>
            <p className="text-gray-400 text-xs">Saved</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center hover:bg-white/10 transition-all shadow-inner">
            <Star className="w-6 h-6 mx-auto mb-2 text-[#FACC15]" />
            <h3 className="text-lg font-semibold">1</h3>
            <p className="text-gray-400 text-xs">Interests</p>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="mt-10 px-6">
          <button className="w-full bg-[#7f1d1d]/60 hover:bg-[#b91c1c]/80 text-red-300 hover:text-white font-medium rounded-2xl py-3 flex items-center justify-center gap-2 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="w-full mt-12 border-t border-white/10 bg-[#0B0C10]/90 backdrop-blur-sm text-center py-10 text-gray-400">
        <h2 className="text-lg font-semibold text-white mb-4">Get in Touch</h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm mb-6">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#4C6EF5]" />
            <span className="text-gray-300">vybin.org</span>
          </div>
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-[#A78BFA]" />
            <a
              href="https://www.instagram.com/wearevybin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition"
            >
              @wearevybin
            </a>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="text-white font-semibold">Vybin</span>. Connecting McGill students through shared experiences.
        </p>

        <div className="flex justify-center gap-4 mt-2 text-xs">
          <a href="#" className="hover:text-[#4C6EF5] transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-[#7C3AED] transition-colors">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
