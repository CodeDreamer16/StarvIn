import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Award, Bookmark, Send, CalendarPlus, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventModal } from './EventModal';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  organization: string;
  location: string;
  date: string;
  deadline: string | null;
  image_url: string;
  prize: string;
  tags: string[];
  link?: string;
}

interface SavedEvent {
  event_id: string;
}

interface Application {
  event_id: string;
}

export function FeedTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const eventsPerPage = 10;
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [appliedEvents, setAppliedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();

  // ✅ Smooth scroll helper
  const scrollToTop = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelectorAll('.feed-scroll-container').forEach((el) => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, 100);
  };

  useEffect(() => {
    loadEvents();
    loadUserData();
  }, [user]);

  useEffect(() => {
    // ✅ Set up fade-in observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    // Observe each event card for animation
    if (observerRef.current) {
      document.querySelectorAll('[data-event-card]').forEach((card) => {
        observerRef.current?.observe(card);
      });
    }
  }, [events]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      setAllEvents(data || []);
      setEvents((data || []).slice(0, eventsPerPage));
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [savedResponse, appliedResponse] = await Promise.all([
        supabase.from('saved_events').select('event_id').eq('user_id', user.id),
        supabase.from('applications').select('event_id').eq('user_id', user.id),
      ]);

      if (savedResponse.data)
        setSavedEvents(new Set(savedResponse.data.map((s: SavedEvent) => s.event_id)));

      if (appliedResponse.data)
        setAppliedEvents(new Set(appliedResponse.data.map((a: Application) => a.event_id)));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSave = async (eventId: string) => {
    if (!user) return;

    try {
      if (savedEvents.has(eventId)) {
        await supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', eventId);
        setSavedEvents((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      } else {
        await supabase.from('saved_events').insert({ user_id: user.id, event_id: eventId });
        setSavedEvents((prev) => new Set(prev).add(eventId));
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const addToGoogleCalendar = (event: Event) => {
    const eventDate = new Date(event.date);
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
      event.location
    )}`;
    window.open(url, '_blank');
  };

  const handleApply = async (eventId: string, event: Event) => {
    if (!user || appliedEvents.has(eventId)) return;
    try {
      await supabase.from('applications').insert({
        user_id: user.id,
        event_id: eventId,
        status: 'applied',
      });
      setAppliedEvents((prev) => new Set(prev).add(eventId));
      addToGoogleCalendar(event);
    } catch (error) {
      console.error('Error applying:', error);
    }
  };

  const totalPages = Math.ceil(allEvents.length / eventsPerPage);

  const goToPage = (newPage: number) => {
    const start = newPage * eventsPerPage;
    const end = start + eventsPerPage;
    setEvents(allEvents.slice(start, end));
    setCurrentPage(newPage);
    scrollToTop();
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openModal = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading events...</p>
      </div>
    );

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 feed-scroll-container">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <p className="text-gray-400 mb-4">No events found.</p>
          </div>
        ) : (
          <div className="px-4 space-y-4 pb-4 transition-all duration-300 ease-out">
            {events.map((event, idx) => {
              const isSaved = savedEvents.has(event.id);
              const isApplied = appliedEvents.has(event.id);
              const isVisible = visibleCards.has(`event-${event.id}`);

              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  data-event-card
                  className={`bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-700 transform ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                    }}
                  >
                    <button
                      onClick={() => handleSave(event.id)}
                      className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          isSaved ? 'fill-[#4C6EF5] text-[#4C6EF5]' : 'text-white'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-bold text-white">{event.title}</h3>
                    <p className="text-gray-400 text-sm">{event.organization}</p>
                    <p className="text-gray-300 text-sm line-clamp-2">{event.description}</p>

                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                      {event.prize && (
                        <div className="flex items-center gap-2 text-[#4C6EF5] font-medium">
                          <Award className="w-4 h-4" />
                          <span>{event.prize}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => openModal(event)}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToGoogleCalendar(event)}
                          className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-500 transition-colors"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add to Calendar
                        </button>
                        <button
                          onClick={() => handleApply(event.id, event)}
                          disabled={isApplied}
                          className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                            isApplied
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          {isApplied ? 'Applied' : (
                            <>
                              <Send className="w-4 h-4" />
                              Apply
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ✅ Clean pagination */}
            <div className="flex flex-col items-center justify-center gap-3 pt-8 pb-10">
              <p className="text-gray-400 text-sm">
                Page {currentPage + 1} of {totalPages || 1}
              </p>
              <div className="flex gap-3">
                {currentPage > 0 && (
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    className="rounded-xl bg-[#1a1d29] px-6 py-3 font-semibold text-white border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    Previous Page
                  </button>
                )}
                {currentPage + 1 < totalPages && (
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    className="rounded-xl bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Next Page
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
