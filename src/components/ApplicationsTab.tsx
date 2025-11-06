import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventModal } from './EventModal';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  organization: string | null;
  location: string | null;
  date: string;
  image_url: string | null;
  tags: string[] | null;
  prize: string | null;
  link?: string | null;
}

interface Application {
  event_id: string;
}

export function ApplicationsTab() {
  const { user } = useAuth();
  const [appliedEvents, setAppliedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);

  const stripHTML = (html?: string | null) =>
    (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
      const { data: apps, error: appErr } = await supabase
        .from('applications')
        .select('event_id')
        .eq('user_id', user.id);
      if (appErr) throw appErr;

      if (!apps?.length) {
        setAppliedEvents([]);
        return;
      }

      const eventIds = apps.map((a: Application) => a.event_id);
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (evErr) throw evErr;
      setAppliedEvents(events ?? []);
    } catch (err) {
      console.error('Error loading applications:', err);
      setAppliedEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  // Fade-in animation setup
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id') ?? '';
          if (entry.isIntersecting && id)
            setVisibleCards((prev) => new Set(prev).add(id));
        });
      },
      { threshold: 0.15, rootMargin: '100px' }
    );
    document.querySelectorAll('[data-app-card]').forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [appliedEvents]);

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
        Loading your applications...
      </div>
    );
  }

  if (!appliedEvents.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-semibold text-white mb-2">No applications yet</p>
        <p className="text-gray-500 text-sm">
          Apply to events and track them here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 bg-[#0B0C10]">
        <div className="px-6 pt-6 pb-4 sticky top-0 bg-[#0B0C10]/80 backdrop-blur z-10 border-b border-white/5">
          <h1 className="text-3xl font-bold text-white">Applications</h1>
          <p className="text-gray-400">Track your event applications</p>
        </div>

        <div className="px-6 py-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {appliedEvents.map((ev, idx) => {
            const id = `app-${ev.id}`;
            const visible = visibleCards.has(id);
            const bg = ev.image_url
              ? `url(${ev.image_url})`
              : 'linear-gradient(135deg, #4C6EF5 0%, #7C3AED 100%)';

            return (
              <div
                key={ev.id}
                id={id}
                data-app-card
                className={`relative rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md
                  bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                  transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_15px_45px_rgba(100,80,255,0.3)]
                  hover:border-[#6D28D9]/40 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{
                  transitionDelay: `${idx * 50}ms`,
                  backgroundImage: bg,
                  backgroundSize: ev.image_url ? 'cover' : 'auto',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{ev.title}</h3>
                    {ev.organization && (
                      <p className="text-gray-300 text-sm mb-2">{ev.organization}</p>
                    )}
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {stripHTML(ev.description)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(ev.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{ev.location ?? 'McGill University'}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => openModal(ev)}
                      className="w-full bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] hover:from-[#5F7FFF] hover:to-[#8B5CF6] transition-all text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> View Details
                    </button>
                    <div className="text-center mt-2 text-gray-400 text-sm">
                      Applied {formatDate(ev.date)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
