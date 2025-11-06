import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Eye, CheckCircle2 } from 'lucide-react';
import { EventModal } from './EventModal';

interface EventApplication {
  id: string;
  event_id: string;
  created_at: string;
  events: {
    id: string;
    title: string;
    organization: string | null;
    description: string | null;
    date: string;
    location: string | null;
    image_url: string | null;
  };
}

export function ApplicationsTab() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          id,
          event_id,
          created_at,
          events (
            id,
            title,
            organization,
            description,
            date,
            location,
            image_url
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const openModal = (event: any) => {
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
        Loading applications...
      </div>
    );
  }

  if (!applications.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
        <CheckCircle2 className="w-10 h-10 mb-3 text-gray-500" />
        <p className="font-medium text-gray-300">No applications yet</p>
        <p className="text-sm text-gray-500">Apply to events to see them here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applications.map((app) => {
          const event = app.events;
          return (
            <div
              key={app.id}
              className="bg-gradient-to-br from-[#1a1d29] to-[#1f1c2c] border border-gray-800 rounded-2xl overflow-hidden hover:shadow-[0_0_12px_2px_rgba(124,58,237,0.4)] transition-all duration-300"
            >
              {event?.image_url && (
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
                      {event?.title}
                    </h3>
                    {event?.organization && (
                      <p className="text-gray-400 text-sm">{event.organization}</p>
                    )}
                  </div>

                  <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Applied
                  </span>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">
                  {event?.description?.replace(/<[^>]*>/g, '')}
                </p>

                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event?.date)}</span>
                  <MapPin className="w-4 h-4 ml-2" />
                  <span>{event?.location ?? 'McGill University'}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(event)}
                    className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>

                  <div className="flex items-center justify-center px-3 rounded-xl bg-[#1f1c2c] text-gray-400 border border-gray-700">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(app.created_at)}
                  </div>
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
