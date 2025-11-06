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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Applications / Deadlines': ['application', 'deadline', 'apply', 'registration', 'submit', 'due date', 'closing date'],
  'Career Fairs / Industry Events': ['career', 'fair', 'industry', 'employer', 'recruitment', 'job', 'internship', 'company'],
  'Design Teams & Clubs': ['design', 'team', 'club', 'robotics', 'engineering', 'project team', 'student team'],
  'Hackathons / Competitions': ['hackathon', 'competition', 'contest', 'challenge', 'coding', 'hack', 'prize'],
  'Networking & Meetups': ['networking', 'meetup', 'connect', 'social', 'mixer', 'coffee chat', 'meet and greet'],
  'Research / SURE Opportunities': ['research', 'sure', 'laboratory', 'study', 'academic', 'thesis', 'undergraduate research'],
  'Tech Talks / Guest Lectures': ['talk', 'lecture', 'speaker', 'presentation', 'seminar', 'guest', 'keynote'],
  'Workshops & Skills Sessions': ['workshop', 'training', 'tutorial', 'skill', 'learn', 'session', 'course', 'class'],
};

export function FeedTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [appliedEvents, setAppliedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadEventsWithPreferences();
    loadUserData();
  }, [user]);

  useEffect(() => {
    // Set up Intersection Observer for fade-in animations
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

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Observe all event cards
    if (observerRef.current) {
      document.querySelectorAll('[data-event-card]').forEach((card) => {
        observerRef.current?.observe(card);
      });
    }
  }, [events]);

  const matchesKeywords = (event: Event, interests: string[]): boolean => {
    const searchText = `${event.title} ${event.description || ''} ${event.event_type || ''} ${event.organization || ''}`.toLowerCase();

    return interests.some(interest => {
      const keywords = CATEGORY_KEYWORDS[interest] || [];
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  };

  const loadEventsWithPreferences = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('interest_name')
        .eq('user_id', user.id);

      if (prefError) throw prefError;

      const userInterests = preferences?.map((p) => p.interest_name) || [];

      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('*, link')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      if (userInterests.length > 0) {
        const filteredEvents = (allEvents || []).filter((event) =>
          matchesKeywords(event, userInterests)
        );
        setEvents(filteredEvents);
      } else {
        setEvents(allEvents || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
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
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSave = async (eventId: string) => {
    if (!user) return;

    try {
      if (savedEvents.has(eventId)) {
        await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);

        setSavedEvents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        await supabase.from('saved_events').insert({
          user_id: user.id,
          event_id: eventId,
        });

        setSavedEvents((prev) => new Set(prev).add(eventId));
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const addToGoogleCalendar = (event: Event) => {
    // Placeholder function for Google Calendar integration
    // Will be connected to actual Google Calendar API later
    const eventDate = new Date(event.date);
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.location)}`;

    window.open(calendarUrl, '_blank');
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

      // Also add to calendar when applying
      addToGoogleCalendar(event);
    } catch (error) {
      console.error('Error applying to event:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading events...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
          <p className="text-gray-400">Find events that match your interests</p>
        </div>

      {events.length === 0 && !loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-center px-8">
            No events yet — check back soon!
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-4">
          {events.slice(0, displayCount).map((event, index) => {
          const isSaved = savedEvents.has(event.id);
          const isApplied = appliedEvents.has(event.id);
          const isVisible = visibleCards.has(`event-${event.id}`);

          return (
            <div
              key={event.id}
              id={`event-${event.id}`}
              data-event-card
              className={`bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div
                className="h-48 bg-cover bg-center relative"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                }}
              >
                <div className="absolute top-4 left-4">
                  <span className="bg-[#4C6EF5] text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {event.event_type}
                  </span>
                </div>
                <button
                  onClick={() => handleSave(event.id)}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  <Bookmark
                    className={`w-5 h-5 ${isSaved ? 'fill-[#4C6EF5] text-[#4C6EF5]' : 'text-white'}`}
                  />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                  <p className="text-gray-400 text-sm">{event.organization}</p>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">{event.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  {event.prize && (
                    <div className="flex items-center gap-2 text-[#4C6EF5] text-sm font-medium">
                      <Award className="w-4 h-4" />
                      <span>{event.prize}</span>
                    </div>
                  )}
                </div>

                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
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
                      className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600 transition-colors"
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
                          : 'bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {isApplied ? (
                        'Applied'
                      ) : (
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

          {displayCount < events.length && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={() => setDisplayCount(prev => prev + 20)}
                className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
