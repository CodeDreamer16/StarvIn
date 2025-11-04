import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Award, Bookmark, Send, Eye } from 'lucide-react';
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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Wellness & Mental Health': ['wellness', 'mental health', 'therapy', 'yoga', 'stress', 'anxiety', 'support group', 'mindfulness', 'meditation', 'health'],
  'Career & Professional Development': ['career', 'job', 'linkedin', 'internship', 'resume', 'professional', 'networking', 'employment', 'industry'],
  'Workshops & Skill Building': ['workshop', 'skill', 'training', 'tutorial', 'learn', 'citation', 'skillsets'],
  'Social & Community Events': ['social', 'community', 'meetup', 'party', 'event', 'gathering', 'connect'],
  'Arts & Creative Activities': ['art', 'creative', 'studio', 'craft', 'artistic', 'hive'],
  'Academic Support & Research': ['academic', 'research', 'library', 'phd', 'study', 'graduate', 'masters'],
  'International Student Services': ['international', 'immigration', 'iss', 'visa', 'caq', 'legal'],
  'Leadership & Personal Growth': ['leadership', 'leader', 'personal growth', 'emerging leaders', 'mindset'],
};

export function FeedTab() {
  const [events, setEvents] = useState<Event[]>([]);
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

  useEffect(() => {
    loadEventsWithPreferences(currentPage);
    loadUserData();
  }, [user, currentPage]);

  useEffect(() => {
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
    if (observerRef.current) {
      document.querySelectorAll('[data-event-card]').forEach((card) => {
        observerRef.current?.observe(card);
      });
    }
  }, [events]);

  const matchesKeywords = (event: Event, interests: string[]): boolean => {
    const searchText = `${event.title} ${event.description || ''} ${event.event_type || ''} ${event.organization || ''}`.toLowerCase();
    return interests.some((interest) => {
      const keywords = CATEGORY_KEYWORDS[interest] || [];
      return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
    });
  };

  const loadEventsWithPreferences = async (page = 0) => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      console.log(`Fetching page ${page}`);

      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user.id);

      if (prefError) throw prefError;

      const userInterests = preferences?.map((p) => p.interest_name) || [];

      const start = page * eventsPerPage;
      const end = start + eventsPerPage - 1;

      const { data: pageEvents, error: eventsError } = await supabase
        .from('events')
        .select('*, link')
        .order('date', { ascending: true })
        .range(start, end);

      if (eventsError) throw eventsError;

      const filtered = userInterests.length
        ? (pageEvents || []).filter((e) => matchesKeywords(e, userInterests))
        : pageEvents || [];

      // Append instead of replace
      setEvents(filtered);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    try {
      const [savedRes, appliedRes] = await Promise.all([
        supabase.from('saved_events').select('event_id').eq('user_id', user.id),
        supabase.from('applications').select('event_id').eq('user_id', user.id),
      ]);
      if (savedRes.data) setSavedEvents(new Set(savedRes.data.map((s: SavedEvent) => s.event_id)));
      if (appliedRes.data) setAppliedEvents(new Set(appliedRes.data.map((a: Application) => a.event_id)));
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handleSave = async (id: string) => {
    if (!user) return;
    try {
      if (savedEvents.has(id)) {
        await supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', id);
        setSavedEvents((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await supabase.from('saved_events').insert({ user_id: user.id, event_id: id });
        setSavedEvents((prev) => new Set(prev).add(id));
      }
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const addToGoogleCalendar = (event: Event) => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.location)}`;
    window.open(url, '_blank');
  };

  const handleApply = async (id: string, event: Event) => {
    if (!user || appliedEvents.has(id)) return;
    try {
      await supabase.from('applications').insert({ user_id: user.id, event_id: id, status: 'applied' });
      setAppliedEvents((prev) => new Set(prev).add(id));
      addToGoogleCalendar(event);
    } catch (err) {
      console.error('Error applying to event:', err);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const openModal = (e: Event) => {
    setSelectedEvent(e);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-white">Loading events...</div>
      </div>
    );

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="mb-1 text-3xl font-bold text-white">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

        {events.length === 0 && !loading ? (
          <div className="flex h-64 flex-col items-center justify-center px-8 text-center">
            <p className="mb-4 text-gray-400">No upcoming events match your interests right now.</p>
            <p className="text-sm text-gray-500">Try updating your preferences to discover more events!</p>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-4">
            {events.map((event, index) => {
              const isSaved = savedEvents.has(event.id);
              const isApplied = appliedEvents.has(event.id);
              const isVisible = visibleCards.has(`event-${event.id}`);

              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  data-event-card
                  className={`rounded-3xl border border-gray-800 bg-[#1a1d29] transition-all duration-500 hover:border-gray-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div
                    className="relative h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                    }}
                  >
                    <div className="absolute top-4 left-4">
                      <span className="rounded-full bg-[#4C6EF5] px-3 py-1 text-xs font-semibold text-white">
                        {event.event_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSave(event.id)}
                      className="absolute top-4 right-4 rounded-full bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-[#4C6EF5] text-[#4C6EF5]' : 'text-white'}`} />
                    </button>
                  </div>

                  <div className="space-y-3 p-5">
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-white">{event.title}</h3>
                      <p className="text-sm text-gray-400">{event.organization}</p>
                    </div>

                    <p className="line-clamp-2 text-sm text-gray-300">{event.description}</p>

                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                      {event.prize && (
                        <div className="flex items-center gap-2 font-medium text-[#4C6EF5]">
                          <Award className="h-4 w-4" />
                          <span>{event.prize}</span>
                        </div>
                      )}
                    </div>

                    {event.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={() => openModal(event)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] py-3 font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>

                      <button
                        onClick={() => handleApply(event.id, event)}
                        disabled={isApplied}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all ${
                          isApplied
                            ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                            : 'bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {isApplied ? 'Applied' : (
                          <>
                            <Send className="h-4 w-4" />
                            Apply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-center gap-3 pt-4 pb-2">
              {loading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-xl bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Next Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
