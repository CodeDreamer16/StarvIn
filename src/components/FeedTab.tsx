import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Award, Bookmark, Send, Eye } from 'lucide-react';
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
  deadline: string | null;
  image_url: string | null;
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
}

interface SavedEvent { event_id: string }
interface Application { event_id: string }

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Wellness & Mental Health': ['wellness','mental','therapy','yoga','stress','anxiety','mindfulness','meditation','counsel','support','health','well-being'],
  'Career & Professional Development': ['career','linkedin','resume','interview','job','intern','networking','recruit','employer','negotiation','cover letter'],
  'Workshops & Skill Building': ['workshop','training','tutorial','learn','skill','session','seminar','bootcamp','hands-on'],
  'Social & Community Events': ['social','community','party','mixer','network','hangout','gathering','club','society','meetup'],
  'Arts & Creative Activities': ['art','creative','music','craft','crochet','film','photography','painting','dance','performance','studio'],
  'Academic Support & Research': ['academic','research','study','writing','thesis','library','citation','apa','grad','graduate','phd'],
  'International Student Services': ['international','immigration','visa','iss','caq','passport','newcomer','global'],
  'Leadership & Personal Growth': ['leadership','leader','growth','development','coach','mindset','emerging','self','improvement']
};

// helpers
const stripHTML = (html?: string | null) =>
  (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const normalize = (s?: string | null) =>
  (s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const matchesByInterest = (event: Event, interests: string[]) => {
  const text = normalize(`${event.title ?? ''} ${stripHTML(event.description)} ${event.organization ?? ''}`);
  const type = normalize(event.event_type);
  for (const interest of interests) {
    const kws = CATEGORY_KEYWORDS[interest] ?? [];
    for (const kw of kws) {
      const norm = normalize(kw);
      if (text.includes(norm) || type.includes(norm)) return true;
    }
    if (type.includes(normalize(interest))) return true;
  }
  return false;
};

export function FeedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const perPage = 10;
  const [modalEvent, setModalEvent] = useState<Event | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // init
  useEffect(() => {
    if (user) {
      loadEvents();
      loadUserData();
      setPage(0);
      setVisible(new Set());
    }
  }, [user]);

  // intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id');
          if (entry.isIntersecting && id) {
            setVisible((prev) => new Set(prev).add(id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '80px' }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    observerRef.current?.disconnect();
    document.querySelectorAll('[data-event-card]').forEach((el) => observerRef.current?.observe(el));
  }, [events, page]);

  // scroll to top smoothly when page changes
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        setVisible(new Set());
      }, 150);
    });
  }, [page]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user?.id);

      const { data: allEvents } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (!allEvents) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const now = new Date();
      const upcoming = allEvents.filter((e) => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d >= now;
      });

      if (!prefs?.length) {
        setEvents(upcoming);
        setLoading(false);
        return;
      }

      const interests = prefs.map((p) => p.interest_name);
      const filtered = upcoming.filter((e) => matchesByInterest(e, interests));
      setEvents(filtered);
    } catch (err) {
      console.error('loadEvents error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [s, a] = await Promise.all([
        supabase.from('saved_events').select('event_id').eq('user_id', user?.id),
        supabase.from('applications').select('event_id').eq('user_id', user?.id),
      ]);
      if (s.data) setSaved(new Set(s.data.map((x) => x.event_id)));
      if (a.data) setApplied(new Set(a.data.map((x) => x.event_id)));
    } catch (e) {
      console.error('loadUserData error:', e);
    }
  };

  const handleApply = async (id: string, e: Event) => {
    if (applied.has(id)) return;
    await supabase.from('applications').insert({ user_id: user?.id, event_id: id, status: 'applied' });
    setApplied((p) => new Set(p).add(id));
    const start = new Date(e.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        e.title
      )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(stripHTML(e.description))}&location=${encodeURIComponent(
        e.location ?? ''
      )}`,
      '_blank'
    );
  };

  const handleSave = async (id: string) => {
    if (saved.has(id)) {
      await supabase.from('saved_events').delete().eq('user_id', user?.id).eq('event_id', id);
      setSaved((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    } else {
      await supabase.from('saved_events').insert({ user_id: user?.id, event_id: id });
      setSaved((p) => new Set(p).add(id));
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(events.length / perPage)), [events.length]);
  const slice = useMemo(() => events.slice(page * perPage, page * perPage + perPage), [events, page]);
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div ref={containerRef} className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-white">Loading events...</div>
        ) : slice.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8 text-center text-gray-400">
            No events match your preferences.
          </div>
        ) : (
          <div className="px-4 space-y-4 pb-4">
            {slice.map((e, i) => {
              const id = `event-${e.id}`;
              const vis = visible.has(id);
              return (
                <div
                  key={e.id}
                  id={id}
                  data-event-card
                  className={`bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-500 ${
                    vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${i * 35}ms` }}
                >
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.7)), url(${e.image_url ?? ''})`,
                    }}
                  >
                    {e.event_type && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#4C6EF5] text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {e.event_type}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleSave(e.id)}
                      className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Bookmark className={`w-5 h-5 ${saved.has(e.id) ? 'fill-[#4C6EF5] text-[#4C6EF5]' : 'text-white'}`} />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{e.title}</h3>
                      {e.organization && <p className="text-gray-400 text-sm">{e.organization}</p>}
                    </div>

                    <p className="text-gray-300 text-sm line-clamp-2">{stripHTML(e.description)}</p>

                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{fmt(e.date)}</div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{e.location ?? 'McGill University'}</div>
                      {e.prize && (
                        <div className="flex items-center gap-2 text-[#4C6EF5] font-medium">
                          <Award className="w-4 h-4" />{e.prize}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => { setModalEvent(e); setOpen(true); }}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90"
                      >
                        <Eye className="w-4 h-4" />View Details
                      </button>
                      <button
                        onClick={() => handleApply(e.id, e)}
                        disabled={applied.has(e.id)}
                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                          applied.has(e.id)
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {applied.has(e.id) ? 'Applied' : (<><Send className="w-4 h-4" />Apply</>)}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {events.length > perPage && (
              <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                <p className="text-gray-400 text-sm">Page {page + 1} of {totalPages}</p>
                {page > 0 && (
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="bg-[#1a1d29] text-white px-6 py-3 rounded-xl hover:bg-[#252837] border border-gray-700"
                  >
                    Previous
                  </button>
                )}
                {page + 1 < totalPages && (
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white px-8 py-3 rounded-xl hover:opacity-90"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <EventModal event={modalEvent} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
