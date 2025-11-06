import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Interest {
  id: string;
  name: string;
  icon: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('name');

      if (error) throw error;
      setInterests(data || []);
    } catch (error) {
      console.error('Error loading interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(interestId)) {
        newSet.delete(interestId);
      } else {
        newSet.add(interestId);
      }
      return newSet;
    });
  };

  const handleComplete = async () => {
    if (selectedInterests.size === 0 || !user) return;

    try {
      setSaving(true);

      const selectedInterestNames = Array.from(selectedInterests)
        .map(interestId => {
          const interest = interests.find(i => i.id === interestId);
          return interest?.name;
        })
        .filter(Boolean);

      const preferenceInserts = selectedInterestNames.map((interestName) => ({
        user_id: user.id,
        interest_name: interestName,
      }));

      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .insert(preferenceInserts);

      if (preferencesError) throw preferencesError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarded: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      onComplete();
    } catch (error) {
      console.error('Error saving interests:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-6 pt-12 pb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            What are you interested in?
          </h1>
          <p className="text-gray-400">
            Select at least one topic to personalize your feed
          </p>
        </div>

        <div className="px-4 grid grid-cols-2 gap-3">
          {interests.map((interest) => {
            const isSelected = selectedInterests.has(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#4C6EF5]/20 to-[#7C3AED]/20 border-[#4C6EF5]'
                    : 'bg-[#1a1d29] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-2">{getIcon(interest.icon)}</div>
                <div className="text-white font-medium text-sm">{interest.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10] to-transparent px-6 py-6">
        <button
          onClick={handleComplete}
          disabled={selectedInterests.size === 0 || saving}
          className="w-full bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            'Saving...'
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
        <p className="text-center text-gray-500 text-sm mt-3">
          {selectedInterests.size} selected
        </p>
      </div>
    </div>
  );
}

function getIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    laptop: '💻',
    briefcase: '💼',
    palette: '🎨',
    megaphone: '📣',
    cog: '⚙️',
    brain: '🧠',
    rocket: '🚀',
    'dollar-sign': '💰',
    heart: '❤️',
    'graduation-cap': '🎓',
  };
  return iconMap[iconName] || '✨';
}
