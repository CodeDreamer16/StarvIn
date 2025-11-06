import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  Eye,
  Bookmark,
  BookmarkCheck,
  SendHorizonal,
  CheckCircle2,
} from 'lucide-react';
import { EventModal } from './EventModal';

interface Event {
  id: string;
  title: string;
  description: string;
  organization: string | null;
  location: string | null;
  date: string;
  image_url: string | null;
  link?: string | null;
}

export function FeedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stripHTML = (html?: string | null) =>
    (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (eventErr) throw eventErr;
        setEvents(eventData ?? []);

        // fetch saved + applied states
        const { data: saved } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('user_id', user.id);

        const { data: apps } = await supabase
          .from('applications')
          .select('event_id')
          .eq('user_id', user.id);

        setSavedIds(saved?.map((s) => s.event_id) ?? []);
        setAppliedIds(apps?.map((a) => a.event_id) ?? []);
      } catch (err) {
        console.error('Error fetching feed events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleSave = async (eventId: string) => {
    if (!user) return;

    const isSaved = savedIds.includes(eventId);
    try {
      if (isSaved) {
        await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
        setSavedIds(savedIds.filter((id) => id !== eventId));
      } else {
        await supabase.from('saved_events').insert([
          { user_id: user.id, event_id: eventId, created_at: new Date().toISOString() },
        ]);
        setSavedIds([...savedIds, eventId]);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const applyToEvent = async (eventId: string) => {
    if (!user) return;
    if (appliedIds.includes(eventId)) return;

    try {
      await supabase.from('applications').insert([
        { user_id: user.id, event_id: eventId, created_at: new Date().toISOString() },
      ]);
      setAppliedIds([...appliedIds, eventId]);
    } catch (err) {
      console.error('Error applying to event:', err);
    }
  };

  const openModal = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading events...
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
        <p className="font-medium text-gray-300">No events available</p>
        <p className="text-sm text-gray-500">
          Check back soon for new opportunities.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => {
          const isSaved = savedIds.includes(event.id);
          const isApplied = appliedIds.includes(event.id);

          return (
            <div
              key={event.id}
              className="bg-gradient-to-br from-[#1a1d29] to-[#1f1c2c] border border-gray-800 rounded-2xl overflow-hidden hover:shadow-[0_0_12px_2px_rgba(124,58,237,0.4)] transition-all duration-300"
            >
              {event.image_url && (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                  }}
                />
              )}

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {event.title}
                    </h3>
                    {event.organization && (
                      <p className="text-gray-400 text-sm">{event.organization}</p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleSave(event.id)}
                    className={`transition ${
                      isSaved ? 'text-purple-400' : 'text-gray-400 hover:text-purple-300'
                    }`}
                    title={isSaved ? 'Remove from saved' : 'Save event'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-5 h-5" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">
                  {stripHTML(event.description)}
                </p>

                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.date)}</span>
                  <MapPin className="w-4 h-4 ml-2" />
                  <span>{event.location ?? 'McGill University'}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(event)}
                    className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>

                  {isApplied ? (
                    <button
                      disabled
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-green-600/20 text-green-400 border border-green-600/40 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => applyToEvent(event.id)}
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#6A00FF] to-[#9333EA] text-white hover:opacity-90 transition-opacity"
                    >
                      <SendHorizonal className="w-4 h-4" />
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
