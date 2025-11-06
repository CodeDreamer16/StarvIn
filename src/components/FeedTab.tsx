import { useState, useEffect } from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Eye, Bookmark, Send } from 'lucide-react';
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
@@ -20,107 +12,281 @@ interface Event {
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
  'Wellness & Mental Health': [
    'wellness', 'mental health', 'therapy', 'yoga', 'stress', 'anxiety', 'mindfulness',
    'student wellness hub', 'health support', 'meditation', 'relaxation', 'self-care',
    'counseling', 'mental', 'support group', 'mental wellbeing'
  ],
  'Career & Professional Development': [
    'career', 'internship', 'job', 'resume', 'cv', 'networking', 'linkedin',
    'career planning service', 'career advising', 'career fair', 'employability',
    'industry', 'professional development', 'interview skills', 'graduate opportunities',
    'skillsets', 'graduate workshops', 'apa citation', 'apa', 'productivity',
    'time management', 'academic writing', 'study skills', 'communication skills',
    'negotiation', 'graduate life', 'professional skills', 'writing workshop',
    'career services', 'career prep', 'career readiness', 'graduate student',
    'success strategies'
  ],
  'Workshops & Skill Building': [
    'workshop', 'training', 'skill building', 'tutorial', 'learning', 'skillsets',
    'graduate workshops', 'academic skills', 'study skills', 'seminar', 'hands-on'
  ],
  'Social & Community Events': [
    'social', 'community', 'meetup', 'event', 'gathering', 'party', 'connect',
    'student life', 'campus life', 'community event', 'peer network', 'hangout', 'mix and mingle'
  ],
  'Arts & Creative Activities': [
    'art', 'creative', 'craft', 'drawing', 'painting', 'film', 'music', 'photography',
    'studio', 'gallery', 'design', 'writing', 'artistic', 'performance'
  ],
  'Academic Support & Research': [
    'academic', 'research', 'study', 'writing', 'library', 'thesis', 'citation', 'apa',
    'study group', 'learning services', 'grad research', 'study tips', 'exam prep'
  ],
  'International Student Services': [
    'international', 'study permit', 'visa', 'iss', 'immigration', 'caq',
    'global learning', 'international students', 'study abroad', 'intercultural', 'travel', 'exchange'
  ],
  'Leadership & Personal Growth': [
    'leadership', 'leader', 'development', 'growth', 'mindset', 'emerging leaders',
    'motivation', 'confidence', 'public speaking', 'personal growth', 'imposter syndrome', 'self improvement'
  ],
};

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

const matchesByInterests = (ev: Event, interests: string[]) => {
  const text = normalize(
    `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ''} ${ev.organization ?? ''}`
  );
  const typeNorm = normalize(ev.event_type);

  for (const interest of interests) {
    const kwList = CATEGORY_KEYWORDS[interest] ?? [];

    if (typeNorm && typeNorm.includes(normalize(interest))) {
      return true;
    }

    const words = text.split(/\s+/);
    for (const kw of kwList) {
      const kwWords = normalize(kw).split(/\s+/);
      if (kwWords.every((w) => words.includes(w))) {
        return true;
      }
    }
  }
  return false;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function FeedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [appliedEvents, setAppliedEvents] = useState<string[]>([]);
  const [savedEvents, setSavedEvents] = useState(new Set<string>());
  const [appliedEvents, setAppliedEvents] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stripHTML = (html?: string | null) =>
    (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const [currentPage, setCurrentPage] = useState(0);
  const eventsPerPage = 10;
  const totalPages = Math.ceil(events.length / eventsPerPage);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadEventsWithPreferences();
    loadUserData();
  }, [user]);

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

  const fetchEvents = async () => {
    if (!user) return;
  const handlePreviousPage = () => {
    setCurrentPage((p) => {
      const prev = Math.max(0, p - 1);
      return prev;
    });
    scrollToTop();
  };

  const loadEventsWithPreferences = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data: prefs, error: prefError } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user.id);

      if (prefError) throw prefError;

      const interests = (prefs ?? []).map((p) => p.interest_name).filter(Boolean) as string[];

      const { data: allEvents, error: eventsError } = await supabase
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
      const now = new Date();
      const upcoming = (allEvents ?? []).filter((e) => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d >= now;
      });

      const { data: appliedData } = await supabase
        .from('applications')
        .select('event_id')
        .eq('user_id', user.id);
      setAppliedEvents(appliedData?.map((r) => r.event_id) ?? []);
      if (!interests.length) {
        setEvents(upcoming);
        setLoading(false);
        return;
      }

      const filtered = upcoming.filter((ev) => matchesByInterests(ev, interests));

      setEvents(filtered);
    } catch (err) {
      console.error('Error fetching feed events:', err);
      console.error('Error loading events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);
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

  const toggleSave = async (eventId: string) => {
  const handleSave = async (eventId: string) => {
    if (!user) return;
    const isSaved = savedEvents.includes(eventId);
    try {
      if (isSaved) {
        await supabase
      if (savedEvents.has(eventId)) {
        const { error } = await supabase
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

        if (error) {
          console.error('Error removing saved event:', error);
          return;
        }

        setSavedEvents((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        setSavedEvents([...savedEvents, eventId]);
      } else {
        const { error } = await supabase
          .from('saved_events')
          .insert({ user_id: user.id, event_id: eventId });

        if (error) {
          console.error('Error saving event:', error);
          return;
        }

        setSavedEvents((prev) => new Set(prev).add(eventId));
      }
    } catch (err) {
      console.error('Error toggling saved state:', err);
      console.error('Error in handleSave:', err);
    }
  };

  const applyToEvent = async (eventId: string) => {
  const handleApply = async (eventId: string, event: Event) => {
    if (!user) return;
    if (appliedEvents.includes(eventId)) return;
    try {
      await supabase.from('applications').insert({
        user_id: user.id,
        event_id: eventId,
        created_at: new Date().toISOString(),
      });
      setAppliedEvents([...appliedEvents, eventId]);
      if (appliedEvents.has(eventId)) return;

      const { error } = await supabase
        .from('applications')
        .insert({ user_id: user.id, event_id: eventId });

      if (error) {
        console.error('Error applying to event:', error);
        return;
      }

      setAppliedEvents((prev) => new Set(prev).add(eventId));

      const start = new Date(event.date);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.title
      )}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0]}Z&details=${encodeURIComponent(
        stripHTML(event.description)
      )}&location=${encodeURIComponent(event.location ?? 'McGill University')}`;

      window.open(calendarUrl, '_blank');
    } catch (err) {
      console.error('Error applying to event:', err);
      console.error('Error in handleApply:', err);
    }
  };

  const openModal = (ev: Event) => {
    setSelectedEvent(ev);
  const openModal = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

@@ -129,118 +295,121 @@ export function FeedTab() {
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
  const pageSlice = useMemo(() => {
    const start = currentPage * eventsPerPage;
    return events.slice(start, start + eventsPerPage);
  }, [events, currentPage]);

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
      <div ref={containerRef} className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

                <p className="text-gray-300 text-sm line-clamp-2">
                  {stripHTML(event.description)}
                </p>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-white">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <p className="text-gray-400 text-center mb-2">No upcoming events match your interests right now.</p>
            <p className="text-gray-500 text-sm text-center">Try updating your preferences to discover more events!</p>
          </div>
        ) : (
          <div className="px-4 space-y-4 pb-4">
            {pageSlice.map((event) => {
              const isSaved = savedEvents.has(event.id);
              const isApplied = appliedEvents.has(event.id);

                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.date)}</span>
                  <MapPin className="w-4 h-4 ml-2" />
                  <span>{event.location ?? 'McGill University'}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
              return (
                <div
                  key={event.id}
                  className="relative bg-gradient-to-br from-[#1a1d29] via-[#252550] to-[#1a1d29] rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                >
                  <button
                    onClick={() => openModal(event)}
                    className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
                    onClick={() => handleSave(event.id)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                    <Bookmark
                      className={`w-5 h-5 ${
                        isSaved ? 'fill-purple-400 text-purple-400' : 'text-white'
                      }`}
                    />
                  </button>

                  {isApplied ? (
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                    {event.organization && (
                      <p className="text-sm text-gray-300 mb-3">{event.organization}</p>
                    )}
                    <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                      {stripHTML(event.description)}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location ?? 'Online'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      disabled
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#1f1c2c] border border-gray-700 text-gray-400 cursor-not-allowed"
                      onClick={() => openModal(event)}
                      className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Applied
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  ) : (

                    <button
                      onClick={() => applyToEvent(event.id)}
                      className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#1f1c2c] border border-gray-700 text-gray-300 hover:text-white transition"
                      onClick={() => handleApply(event.id, event)}
                      disabled={isApplied}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        isApplied
                          ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800/50 text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      Apply
                      {isApplied ? 'Applied' : 'Apply'}
                    </button>
                  )}
                  </div>
                </div>
              );
            })}

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
            </div>
          );
        })}
            )}
          </div>
        )}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}