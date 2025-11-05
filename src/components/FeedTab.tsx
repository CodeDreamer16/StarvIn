// src/components/FeedTab.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Award, Bookmark, Send, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventModal } from './EventModal';

/** ---------- Types ---------- */
interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  organization: string | null;
  location: string | null;
  date: string;                  // ISO string in DB
  deadline: string | null;
  image_url: string | null;
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
}
interface SavedEvent { event_id: string }
interface Application { event_id: string }

/** ---------- Interest → keywords (expandable) ---------- */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Wellness & Mental Health': [
    'wellness','mental','therapy','yoga','stress','anxiety','support group','mindfulness',
    'meditation','health','well-being','wellbeing','care','wellness hub'
  ],
  'Career & Professional Development': [
    'career','job','internship','resume','cv','linkedin','recruit','network','networking',
    'employer','interview','negotiation','career planning','work search','career advising'
  ],
  'Workshops & Skill Building': [
    'workshop','skill','training','tutorial','learn','skillsets','certificate','session',
    'hands-on','how to','seminar','clinic'
  ],
  'Social & Community Events': [
    'social','community','mixer','meetup','gathering','party','connect','hangout','celebration','circle'
  ],
  'Arts & Creative Activities': [
    'art','creative','hive','studio','crochet','craft','drawing','painting','music','film','theatre','photography'
  ],
  'Academic Support & Research': [
    'academic','research','library','thesis','phd','masters','dissertation','citation','apa','study tips','writing','grad'
  ],
  'International Student Services': [
    'international','immigration','iss','visa','study permit','caq','global','newcomer','intercultural','orientation'
  ],
  'Leadership & Personal Growth': [
    'leadership','leader','personal growth','mindset','emerging leaders','development','imposter syndrome','coach'
  ],
};

/** ---------- Helpers ---------- */
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

/** Compute a relevance score: more keyword hits = higher; exact event_type matches boosted */
function relevanceScore(ev: Event, interests: string[]) {
  const text = normalize(
    `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ''} ${ev.organization ?? ''}`
  );
  let score = 0;

  for (const interest of interests) {
    const kws = CATEGORY_KEYWORDS[interest] ?? [];
    for (const kw of kws) {
      const k = normalize(kw);
      if (k && text.includes(k)) score += 3; // keyword match
    }
    // event_type partial match boost
    const t = normalize(ev.event_type);
    if (t && t.includes(normalize(interest))) score += 5;
  }

  // newer events slightly favored
  const d = new Date(ev.date).getTime();
  if (!Number.isNaN(d)) score += Math.max(0, 1_000_000_000_000 - (Date.now() - d)) / 1e12;

  return score;
}

/** ---------- Component ---------- */
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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();

  /** Load feed whenever user changes */
  useEffect(() => {
    loadEventsWithPreferences();
    loadUserData();
    // reset paging/animations
    setCurrentPage(0);
    setVisibleCards(new Set());
  }, [user]);

  /** Intersection observer for per-card fade/slide */
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
      { threshold: 0.12, rootMargin: '80px' }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  /** Re-observe on page/events change so pages always animate */
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
      { threshold: 0.12, rootMargin: '80px' }
    );
    document.querySelectorAll('[data-event-card]').forEach((el) => {
      observerRef.current?.observe(el);
    });
  }, [events, currentPage]);

  /** Smooth scroll to top on page change + reset animation flags */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    setVisibleCards(new Set());
  }, [currentPage]);

  /** ----- Data loaders ----- */
  const loadEventsWithPreferences = async () => {
    setLoading(true);
    try {
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // 1) Get interests
      const { data: prefs, error: prefError } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user.id);
      if (prefError) throw prefError;
      const interests = (prefs ?? []).map((p) => p.interest_name).filter(Boolean) as string[];

      // 2) Pull upcoming events
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

      if (!interests.length) {
        // If no interests: show everything upcoming (you can switch to empty state if you prefer)
        setEvents(upcoming);
        return;
      }

      // 3) Filter + rank by relevance
      const filtered = upcoming.filter((ev) => {
        const text = normalize(
          `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ''} ${ev.organization ?? ''}`
        );
        // at least one keyword or type match
        for (const interest of interests) {
          const kws = CATEGORY_KEYWORDS[interest] ?? [];
          if (kws.some((kw) => text.includes(normalize(kw)))) return true;
          const t = normalize(ev.event_type);
          if (t && t.includes(normalize(interest))) return true;
        }
        return false;
      });

      const ranked = filtered
        .map((ev) => ({ ev, score: relevanceScore(ev, interests) }))
        .sort((a, b) => b.score - a.score)
        .map(({ ev }) => ev);

      setEvents(ranked);
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

  /** ----- Actions ----- */
  const handleSave = async (eventId: string) => {
    if (!user) return;
    try {
      if (savedEvents.has(eventId)) {
        await supabase.from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
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

  const openModal = (ev: Event) => { setSelectedEvent(ev); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedEvent(null), 220); };

  /** ----- Paging ----- */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(events.length / eventsPerPage)),
    [events.length]
  );

  const pageSlice = useMemo(() => {
    const start = currentPage * eventsPerPage;
    return events.slice(start, start + eventsPerPage);
  }, [events, currentPage]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  /** ---------- UI ---------- */
  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-24 bg-[#0B0C10]"
      >
        {/* Header */}
        <div className="px-4 pt-6 pb-4 sticky top-0 z-10 bg-[#0B0C10]/80 backdrop-blur border-b border-white/5">
          <h1 className="text-3xl font-bold text-white tracking-tight">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-white">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <p className="text-gray-300 text-center mb-2">No upcoming events match your interests right now.</p>
            <p className="text-gray-500 text-sm text-center">Try updating your preferences to discover more events!</p>
          </div>
        ) : (
          <div className="px-4 space-y-4 py-4">
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
                  className={[
                    // Glass card
                    "relative rounded-3xl overflow-hidden border border-white/10",
                    "bg-white/5 backdrop-blur-md",
                    "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]",
                    "hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55)]",
                    "hover:border-white/15 transition-all duration-500",
                    // Page/card animation
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  ].join(' ')}
                  style={{ transitionDelay: `${idx * 35}ms` }}
                >
                  {/* Banner */}
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.65)), url(${event.image_url ?? ''})`,
                    }}
                  >
                    {event.event_type && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {event.event_type}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleSave(event.id)}
                      className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm p-2 rounded-full hover:bg-black/60 transition"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${isSaved ? 'fill-[#A78BFA] text-[#A78BFA]' : 'text-white'}`}
                      />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 leading-snug">{event.title}</h3>
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
                        <div className="flex items-center gap-2 text-[#A78BFA] text-sm font-medium">
                          <Award className="w-4 h-4" />
                          <span>{event.prize}</span>
                        </div>
                      )}
                    </div>

                    {event.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="bg-white/10 text-gray-200 px-3 py-1 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <button
                        onClick={() => openModal(event)}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2
                                   bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApply(event.id, event)}
                          disabled={isApplied}
                          className={[
                            "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                            isApplied
                              ? "bg-white/10 text-gray-400 cursor-not-allowed"
                              : "bg-black/40 text-white border border-white/15 hover:border-white/25 backdrop-blur"
                          ].join(' ')}
                        >
                          {isApplied ? 'Applied' : (<><Send className="w-4 h-4" />Apply</>)}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtle glow */}
                  <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-[#4C6EF5]/10 to-[#7C3AED]/10 opacity-0 hover:opacity-100 transition" />
                </div>
              );
            })}

            {/* Pagination */}
            {events.length > eventsPerPage && (
              <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                <p className="text-gray-400 text-sm">Page {currentPage + 1} of {totalPages}</p>
                {currentPage > 0 && (
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    className="bg-white/5 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition border border-white/10"
                  >
                    Previous
                  </button>
                )}
                {currentPage + 1 < totalPages && (
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition"
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
