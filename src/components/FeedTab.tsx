import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Award, Bookmark, Send, Eye } from 'lucide-react';
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
  date: string;                 // ISO string in DB
  deadline: string | null;
  image_url: string | null;
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
}

interface SavedEvent { event_id: string }
interface Application { event_id: string }

/** 🔎 Interest → keyword map (expandable) */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Wellness & Mental Health': [
    'student wellness hub', 'wellness', 'mental health', 'therapy', 'stress', 'mindfulness',
    'yoga', 'self-care', 'resilience', 'mental wellbeing', 'support group', 'eating disorder',
    'anxiety', 'counselling', 'well-being'
  ],
  'Career & Professional Development': [
    'career planning service', 'career', 'job', 'internship', 'linkedin', 'resume', 'cv',
    'networking', 'professional development', 'skillsets graduate workshops', 'skillsets',
    'apa citation', 'academic writing', 'communication skills', 'employability',
    'field study', 'career fair', 'success strategies'
  ],
  'Workshops & Skill Building': [
    'workshop', 'training', 'seminar', 'graduate workshop', 'skill building',
    'tutorial', 'learning', 'certificate', 'skillsets'
  ],
  'Social & Community Events': [
    'campus life & engagement', 'orientation', 'social', 'mixer', 'community', 'first-up mixer',
    'engagement', 'meetup', 'student life', 'peer network'
  ],
  'Arts & Creative Activities': [
    'art', 'creative', 'design', 'music', 'film', 'photography', 'performance', 'gallery'
  ],
  'Academic Support & Research': [
    'mcgill library', 'library', 'academic', 'research', 'study', 'citation', 'writing',
    'learning', 'thesis', 'exam', 'grad research', 'matlab', 'quantitative life sciences'
  ],
  'International Student Services': [
    'international student services', 'iss', 'visa', 'study permit', 'caq', 'immigration',
    'orientation', 'global', 'intercultural'
  ],
  'Leadership & Personal Growth': [
    'leadership', 'personal growth', 'religious', 'spiritual', 'reflection', 'motivation',
    'emerging leaders', 'mindset', 'faith', 'morals', 'values'
  ],
};

/** Helpers */
const stripHTML = (html?: string | null) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (s?: string | null) =>
  (s ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Match event to any of the selected interests using keywords and event_type fallback */
const matchesByInterests = (ev: Event, interests: string[]) => {
  const text = normalize(
    `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ''} ${ev.organization ?? ''}`
  );
  const typeNorm = normalize(ev.event_type);
  let matchedInterest: string | null = null;

  for (const interest of interests) {
    const kwList = CATEGORY_KEYWORDS[interest] ?? [];

    // 1️⃣ Strong match if event_type directly matches interest
    if (typeNorm && typeNorm.includes(normalize(interest))) {
      matchedInterest = interest;
      break;
    }

    // 2️⃣ Otherwise, try word-level matching (requires exact keyword presence)
    for (const kw of kwList) {
      const kwNorm = normalize(kw);
      const regex = new RegExp(`\\b${kwNorm}\\b`, 'i'); // whole-word match
      if (regex.test(text)) {
        matchedInterest = interest;
        break;
      }
    }

    if (matchedInterest) break;
  }

  // 🧩 Logging for debugging:
  if (!matchedInterest && interests.length > 0) {
    console.warn('⚠️ No interest match for:', {
      event: {
        title: ev.title,
        event_type: ev.event_type,
        organization: ev.organization,
      },
      checkedInterests: interests,
      previewText: text.slice(0, 200) + '...',
    });
  }

  return !!matchedInterest;
};

/** Rank events by how strongly they match selected interests */
const rankEventsByRelevance = (events: Event[], interests: string[]) => {
  const scored = events.map(ev => {
    const text = normalize(
      `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ''} ${ev.organization ?? ''}`
    );
    let score = 0;

    for (const interest of interests) {
      const keywords = CATEGORY_KEYWORDS[interest] ?? [];
      for (const word of keywords) {
        if (text.includes(normalize(word))) score += 5; // strong match
      }
      if (normalize(ev.organization)?.includes(normalize(interest))) score += 10;
      if (normalize(ev.event_type)?.includes(normalize(interest))) score += 3;
    }

    // slight boost for upcoming events sooner than later
    const daysAway = (new Date(ev.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (!isNaN(daysAway)) score += Math.max(0, 20 - daysAway); // closer = higher

    return { ...ev, _score: score };
  });

  // sort descending by score
  return scored.sort((a, b) => b._score - a._score);
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();

  /** Load feed whenever user changes */
  useEffect(() => {
    loadEventsWithPreferences();
    loadUserData();
    // reset paging and animation state
    setCurrentPage(0);
    setVisibleCards(new Set());
  }, [user]);

  /** Set up fade/slide observer */
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id') ?? '';
          if (entry.isIntersecting && id) {
            setVisibleCards((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          }
        });
      },
      { threshold: 0.12, rootMargin: '60px' }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  /** Re-observe cards when page/events change (to re-trigger animation each page) */
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id') ?? '';
          if (entry.isIntersecting && id) {
            setVisibleCards((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          }
        });
      },
      { threshold: 0.12, rootMargin: '60px' }
    );
    document.querySelectorAll('[data-event-card]').forEach((el) => {
      observerRef.current?.observe(el);
    });
  }, [events, currentPage]);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    setCurrentPage((p) => {
      const next = Math.min(totalPages - 1, p + 1);
      return next;
    });
    scrollToTop();
  };

  const handlePreviousPage = () => {
    setCurrentPage((p) => {
      const prev = Math.max(0, p - 1);
      return prev;
    });
    scrollToTop();
  };

  useEffect(() => {
    setVisibleCards(new Set());
  }, [currentPage]);

  const loadEventsWithPreferences = async () => {
    setLoading(true);
    try {
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // 1) Get user interests
      const { data: prefs, error: prefError } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user.id);

      if (prefError) throw prefError;

      const interests = (prefs ?? []).map((p) => p.interest_name).filter(Boolean) as string[];

      // 2) Load events (order ascending by date) & keep only upcoming
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      const now = new Date();
      const upcoming = (allEvents ?? []).filter((e) => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d >= now;
      });

      // 3) If user has no interests, show nothing (or show all—your call). We’ll show nothing for now.
      if (!interests.length) {
        setEvents(upcoming);
        setLoading(false);
        return;
      }

      // 4) Keyword-based filtering
      const filtered = upcoming.filter((ev) => matchesByInterests(ev, interests));

      setEvents(rankEventsByRelevance(filtered, interests));
    } catch (err) {
      console.error('Error loading events:', err);
      setEvents([]);
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
      if (savedResponse.data) {
        setSavedEvents(new Set(savedResponse.data.map((s: SavedEvent) => s.event_id)));
      }
      if (appliedResponse.data) {
        setAppliedEvents(new Set(appliedResponse.data.map((a: Application) => a.event_id)));
      }
    } catch (e) {
      console.error('Error loading user data:', e);
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
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  const addToGoogleCalendar = (event: Event) => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
      stripHTML(event.description)
    )}&location=${encodeURIComponent(event.location ?? '')}`;
    window.open(url, '_blank');
  };

  const handleApply = async (eventId: string, event: Event) => {
    if (!user || appliedEvents.has(eventId)) return;
    try {
      await supabase.from('applications').insert({ user_id: user.id, event_id: eventId, status: 'applied' });
      setAppliedEvents((prev) => new Set(prev).add(eventId));
      addToGoogleCalendar(event);
    } catch (e) {
      console.error('Error applying to event:', e);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const openModal = (ev: Event) => { setSelectedEvent(ev); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedEvent(null), 250); };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(events.length / eventsPerPage)),
    [events.length]
  );

  const pageSlice = useMemo(() => {
    const start = currentPage * eventsPerPage;
    return events.slice(start, start + eventsPerPage);
  }, [events, currentPage]);

  return (
    <>
      <div ref={containerRef} className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-white">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <p className="text-gray-400 text-center mb-2">No upcoming events match your interests right now.</p>
            <p className="text-gray-500 text-sm text-center">Try updating your preferences to discover more events!</p>
          </div>
        ) : (
          <div className="px-4 space-y-4 pb-4">
            {pageSlice.map((event, idx) => {
              const isSaved = savedEvents.has(event.id);
              const isApplied = appliedEvents.has(event.id);
              const cardId = `event-${event.id}`;
              const visible = visibleCards.has(cardId);

              return (
                <div
                  key={event.id}
                  id={cardId}
                  data-event-card
                  className={`bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-500
                    ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${idx * 35}ms` }}
                >
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url ?? ''})`,
                    }}
                  >
                    {event.event_type && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#4C6EF5] text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {event.event_type}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleSave(event.id)}
                      className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[#4C6EF5] text-[#4C6EF5]' : 'text-white'}`} />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                      {event.organization && <p className="text-gray-400 text-sm">{event.organization}</p>}
                    </div>

                    <p className="text-gray-300 text-sm line-clamp-2">{stripHTML(event.description)}</p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location ?? 'McGill University'}</span>
                      </div>
                      {event.prize && (
                        <div className="flex items-center gap-2 text-[#4C6EF5] text-sm font-medium">
                          <Award className="w-4 h-4" />
                          <span>{event.prize}</span>
                        </div>
                      )}
                    </div>

                    {event.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <button
                        onClick={() => openModal(event)}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>

                      <div className="flex gap-2">
                        {/* You said Add to Calendar is redundant; keep Apply only if you prefer */}
                        <button
                          onClick={() => handleApply(event.id, event)}
                          disabled={isApplied}
                          className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                            isApplied
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          {isApplied ? 'Applied' : (<><Send className="w-4 h-4" />Apply</>)}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {events.length > eventsPerPage && (
              <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                <p className="text-gray-400 text-sm">Page {currentPage + 1} of {totalPages}</p>
                {currentPage > 0 && (
                  <button
                    onClick={handlePreviousPage}
                    className="bg-[#1a1d29] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#252837] transition-colors border border-gray-700"
                  >
                    Previous
                  </button>
                )}
                {currentPage + 1 < totalPages && (
                  <button
                    onClick={handleNextPage}
                    className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Next Page
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
