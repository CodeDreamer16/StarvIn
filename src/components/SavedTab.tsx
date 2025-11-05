import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Eye, Bookmark } from 'lucide-react';
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

export function SavedTab() {
  const { user } = useAuth();
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
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

  const fetchSavedEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_events')
        .select(
          `
          event_id,
          events (
            id,
            title,
            description,
            event_type,
            organization,
            location,
            date,
            image_url,
            prize,
            tags,
            link
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const events = (data ?? [])
        .map((row: any) => row.events)
        .filter((e: Event) => !!e);

      setSavedEvents(events);
    } catch (err) {
      console.error('Error fetching saved events:', err);
      setSavedEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
  }, [user]);

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
        Loading saved events...
      </div>
    );
  }

  if (!savedEvents.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
        <Bookmark className="w-10 h-10 text-gray-500 mb-3" />
        <p className="text-gray-300 font-medium mb-1">No saved events yet</p>
        <p className="text-gray-500 text-sm">
          Tap the bookmark icon on any event to save it here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {savedEvents.map((event) => (
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

              <button
                onClick={() => openModal(event)}
                className="w-full py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
