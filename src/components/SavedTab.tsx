// src/components/SavedTab.tsx
import { useEffect, useState } from 'react';
import { Bookmark, Calendar, MapPin, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventModal } from './EventModal';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string | null;
  organization: string | null;
  location: string | null;
  date: string;
  image_url: string | null;
  link?: string | null;
}

export function SavedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadSaved = async () => {
    if (!user) { setEvents([]); setLoading(false); return; }
    setLoading(true);

    // 1) get saved rows for this user
    const { data: savedRows, error: savedErr } = await supabase
      .from('saved_events')
      .select('event_id')
      .eq('user_id', user.id);

    if (savedErr) {
      console.error('loadSaved savedErr', savedErr);
      setEvents([]); setLoading(false);
      return;
    }

    const ids = (savedRows ?? []).map(r => r.event_id);
    if (ids.length === 0) { setEvents([]); setLoading(false); return; }

    // 2) fetch events by id
    const { data: evs, error: evErr } = await supabase
      .from('events')
      .select('*')
      .in('id', ids)
      .order('date', { ascending: true });

    if (evErr) {
      console.error('loadSaved evErr', evErr);
      setEvents([]); setLoading(false);
      return;
    }

    setEvents(evs ?? []);
    setLoading(false);
  };

  useEffect(() => { loadSaved(); }, [user]);

  const removeSaved = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  const stripHTML = (html?: string | null) =>
    (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-white mb-1">Saved</h1>
        <p className="text-gray-400">Your bookmarked events</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-white">Loading...</div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
          <Bookmark className="w-10 h-10 text-gray-500 mb-3" />
          <p className="text-gray-300 font-medium mb-1">No saved events yet</p>
          <p className="text-gray-500 text-sm">Tap the bookmark icon on any event to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 pb-4">
          {events.map(ev => (
            <div key={ev.id} className="bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800">
              <div
                className="h-40 bg-cover bg-center relative"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${ev.image_url ?? ''})`,
                }}
              >
                <button
                  onClick={() => removeSaved(ev.id)}
                  className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black/70 transition"
                  aria-label="Remove saved"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-white font-bold text-lg">{ev.title}</h3>
                <p className="text-gray-300 text-sm line-clamp-2">{stripHTML(ev.description)}</p>
                <div className="space-y-1 text-gray-400 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(ev.date)}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{ev.location ?? 'McGill University'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelected(ev); /* open modal */ setIsModalOpen(true); }}
                    className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventModal event={selected} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelected(null); }} />
    </div>
  );
}
