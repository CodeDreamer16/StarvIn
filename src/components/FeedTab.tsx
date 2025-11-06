import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  Eye,
  Bookmark,
  BookmarkCheck,
  Send,
  CheckCircle2,
} from 'lucide-react';
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
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
}

export function FeedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [appliedEvents, setAppliedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventsData ?? []);

      const { data: savedData } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', user.id);
      setSavedEvents(savedData?.map((r) => r.event_id) ?? []);

      const { data: appliedData } = await supabase
        .from('applications')
        .select('event_id')
        .eq('user_id', user.id);
      setAppliedEvents(appliedData?.map((r) => r.event_id) ?? []);
    } catch (err) {
      console.error('Error fetching feed events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const toggleSave = async (eventId: string) => {
    if (!user) return;
    const isSaved = savedEvents.includes(eventId);
    try {
      if (isSaved) {
        await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
        setSavedEvents(savedEvents.filter((id) => id !== eventId));
      } else {
        await supabase.from('saved_events').insert({
          user_id: user.id,
          event_id: eventId,
          created_at: new Date().toISOString(),
        });
        setSavedEvents([...savedEvents, eventId]);
      }
    } catch (err) {
      console.error('Error toggling saved state:', err);
    }
  };

  const applyToEvent = async (eventId: string) => {
    if (!user) return;
    if (appliedEvents.includes(eventId)) return;
    try {
      await supabase.from('applications').insert({
        user_id: user.id,
        event_id: eventId,
        created_at: new Date().toISOString(),
      });
      setAppliedEvents([...appliedEvents, eventId]);
    } catch (err) {
      console.error('Error applying to event:', err);
    }
  };

  const openModal = (ev: Event) => {
    setSelectedEvent(ev);
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
        <Bookmark className="w-10 h-10 mb-3 text-gray-500" />
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
          const isSaved = savedEvents.includes(event.id);
          const isApplied = appliedEvents.includes(event.id);

          return (
            <div
              key={event.id}
              className="relative bg-gradient-to-br from-[#1a1d29] to-[#1f1c2c] border border-gray-800 rounded-2xl overflow-hidden hover:shadow-[0_0_12px_2px_rgba(124,58,237,0.4)] transition-all duration-300"
            >
              {event.image_url && (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                  }}
                />
              )}

              {/* Save Icon */}
              <button
                onClick={() => toggleSave(event.id)}
                className="absolute top-3 right-3 text-gray-400 hover:text-purple-400 transition"
              >
                {isSaved ? (
                  <BookmarkCheck className="w-5 h-5 text-purple-400" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {event.title}
                  </h3>
                  {event.organization && (
                    <p className="text-gray-400 text-sm">{event.organization}</p>
                  )}
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

                <div className="flex flex-col sm:flex-row gap-2">
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
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#1f1c2c] border border-gray-700 text-gray-400 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => applyToEvent(event.id)}
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#1f1c2c] border border-gray-700 text-gray-300 hover:text-white transition"
                    >
                      <Send className="w-4 h-4" />
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
