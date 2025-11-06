import { useState, useEffect } from 'react';
import { LogOut, Mail, Calendar, Bookmark, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  display_name: string;
  email: string;
  created_at: string;
}

interface Stats {
  applications: number;
  savedEvents: number;
  interests: number;
}

export function ProfileTab() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ applications: 0, savedEvents: 0, interests: 0 });
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const [applicationsRes, savedRes, interestsRes] = await Promise.all([
        supabase.from('applications').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('saved_events').select('event_id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('user_interests').select('interest_id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      setStats({
        applications: applicationsRes.count || 0,
        savedEvents: savedRes.count || 0,
        interests: interestsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Profile</h1>
        <p className="text-gray-400">Manage your account</p>
      </div>

      <div className="px-4 space-y-6">
        <div className="bg-gradient-to-br from-[#4C6EF5]/20 to-[#7C3AED]/20 rounded-3xl p-6 border border-[#4C6EF5]/30">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#4C6EF5] to-[#7C3AED] rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.display_name || 'User'}</h2>
              <p className="text-gray-300 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {profile?.email}
              </p>
              {profile?.created_at && (
                <p className="text-gray-400 text-xs mt-1">
                  Member since {formatDate(profile.created_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1d29] rounded-2xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-white mb-1">{stats.applications}</div>
            <div className="text-gray-400 text-xs">Applications</div>
          </div>
          <div className="bg-[#1a1d29] rounded-2xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-white mb-1">{stats.savedEvents}</div>
            <div className="text-gray-400 text-xs">Saved</div>
          </div>
          <div className="bg-[#1a1d29] rounded-2xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-white mb-1">{stats.interests}</div>
            <div className="text-gray-400 text-xs">Interests</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-[#1a1d29] rounded-2xl border border-gray-800 overflow-hidden">
            <button className="w-full p-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">My Applications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-[#1a1d29] rounded-2xl border border-gray-800 overflow-hidden">
            <button className="w-full p-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">Saved Events</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-4 rounded-2xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
