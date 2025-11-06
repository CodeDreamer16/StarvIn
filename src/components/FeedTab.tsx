import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Eye, Send } from 'lucide-react';
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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
      <div className="flex flex-col items-center justify-center h-64 px-8 text-center text-gray-400">
        <p className="font-medium text-gray-300">No events available</p>
        <p className="text-sm text-gray-500">
          Check back soon for upcoming opportunities.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 pt-6 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="relative rounded-2xl overflow-hidden border border-gray-800 bg-gradient-to-b from-[#1a1c22] to-[#12131a] hover:shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all duration-300 hover:-translate-y-1"
          >
            {event.image_url && (
              <div
                className="h-40 bg-cover bg-center opacity-90"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.65)), url(${event.image_url})`,
                }}
              />
            )}

            <div className="p-5 flex flex-col justify-between h-full space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 leading-tight">
                  {event.title}
                </h3>
                {event.organization && (
                  <p className="text-sm text-gray-400 mb-2">{event.organization}</p>
                )}
                <p className="text-gray-300 text-sm line-clamp-2">
                  {stripHTML(event.description)}
                </p>
              </div>

              <div className="flex items-center text-gray-400 text-sm gap-3">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
                <MapPin className="w-4 h-4 ml-2" />
                <span>{event.location ?? 'McGill University'}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openModal(event)}
                  className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => window.open(event.link || '#', '_blank')}
                  className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 bg-[#1f1c2c] border border-gray-700 text-gray-300 hover:text-white transition"
                >
                  <Send className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
