import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventModal } from './EventModal';
import { Calendar, Eye, Trash2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  location: string | null;
  date: string;
  image_url: string | null;
}

export function SavedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSavedEvents();
  }, [user]);

  const loadSavedEvents = async () => {
    setLoading(true);
    try {
      // Get saved event IDs for this user
      const { data: saved, error: savedErr } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', user.id);

      if (savedErr) throw savedErr;
      const ids = (saved ?? []).map((s) => s.event_id);

      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Fetch matching events
      const { data: eventsData, error: eventsErr } = await supabase
        .from('events')
        .select('*')
        .in('id', ids);

      if (eventsErr) throw eventsErr;

      setEvents(eventsData ?? []);
    } catch (err) {
      console.error('Error loading saved events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const removeSaved = async (id: string) => {
    try {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error removing saved event:', err);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 bg-[#0B0C10]">
        <div className="px-6 pt-6 pb-4 sticky top-0 bg-[#0B0C10]/80 backdrop-blur z-10 border-b border-white/5">
          <h1 className="text-3xl font-bold text-white">Saved Events</h1>
          <p className="text-gray-400">Your bookmarked events</p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Loading your saved events...
          </div>
        ) : events.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 px-6 text-center">
            <p className="text-lg font-semibold text-gray-300 mb-2">No saved events yet</p>
            <p className="text-sm text-gray-500">
              Tap the 🔖 icon on any event to save it for later.
            </p>
          </div>
        ) : (
          // Event grid
          <div className="px-6 py-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md p-5
                  hover:shadow-[0_15px_45px_rgba(100,80,255,0.3)] hover:scale-[1.02] transition-all duration-500"
              >
                <h3 className="text-lg font-bold text-white mb-1">{ev.title}</h3>
                <p className="text-gray-300 text-sm line-clamp-3 mb-2">
                  {ev.description?.replace(/<[^>]*>/g, '')}
                </p>
                <div className="text-gray-400 text-sm flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" /> {formatDate(ev.date)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelected(ev);
                      setOpen(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white py-2 rounded-xl font-semibold hover:opacity-90 transition"
                  >
                    <Eye className="inline w-4 h-4 mr-1" /> View
                  </button>
                  <button
                    onClick={() => removeSaved(ev.id)}
                    className="bg-white/10 hover:bg-white/20 text-gray-300 px-4 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventModal event={selected} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
