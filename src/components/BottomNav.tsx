import { Home, FileText, User, Bookmark } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'feed' | 'applications' | 'saved' | 'profile';
  onTabChange: (tab: 'feed' | 'applications' | 'saved' | 'profile') => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0C10]/90 backdrop-blur-md border-t border-white/10 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-20 px-6">
        {/* Feed */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'feed' ? 'text-[#4C6EF5]' : 'text-gray-400'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Feed</span>
        </button>

        {/* Applications */}
        <button
          onClick={() => onTabChange('applications')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'applications' ? 'text-[#4C6EF5]' : 'text-gray-400'
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs font-medium">Applications</span>
        </button>

        {/* Saved */}
        <button
          onClick={() => onTabChange('saved')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'saved' ? 'text-[#4C6EF5]' : 'text-gray-400'
          }`}
        >
          <Bookmark className="w-6 h-6" />
          <span className="text-xs font-medium">Saved</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'profile' ? 'text-[#4C6EF5]' : 'text-gray-400'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
