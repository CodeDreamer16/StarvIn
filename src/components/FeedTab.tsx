import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  MapPin,
  Award,
  Bookmark,
  Send,
  CalendarPlus,
  Eye,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { EventModal } from "./EventModal";

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

  // Load events + user data
  useEffect(() => {
    if (user) {
      loadEventsWithPreferences();
      loadUserData();
    }
  }, [user]);

  // Re-fetch when preferences change (triggered after EditPreferences save)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-prefs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user?.id}` },
        () => loadEventsWithPreferences()
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  
  // Setup intersection observer for fade-in
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Re-observe after new events
  useEffect(() => {
    if (observerRef.current) {
      document.querySelectorAll("[data-event-card]").forEach((card) => {
        observerRef.current?.observe(card);
      });
    }
  }, [events, currentPage]);

  // 🧠 Improved filtering logic
  const loadEventsWithPreferences = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // 1️⃣ Fetch user preferences
      const { data: preferences, error: prefError } = await supabase
        .from("user_preferences")
        .select("interest_name")
        .eq("user_id", user.id);

      if (prefError) throw prefError;

      const userInterests =
        preferences?.map((p) => p.interest_name.toLowerCase()) || [];
      console.log("User interests:", userInterests);

      // 2️⃣ Fetch all events
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // 3️⃣ Filter events based on user preferences
      let filteredEvents = allEvents || [];

      if (userInterests.length > 0) {
        filteredEvents = filteredEvents.filter((event) => {
          const searchText = `
            ${event.title || ""}
            ${event.description || ""}
            ${event.organization || ""}
            ${(event.tags || []).join(" ")}
            ${event.event_type || ""}
          `.toLowerCase();

          return userInterests.some((interest) =>
            searchText.includes(interest.toLowerCase())
          );
        });
      }

      console.log(`Matched ${filteredEvents.length} events`);
      setEvents(filteredEvents);
      if (filteredEvents.length === 0) {
        console.warn("No matching events found for user preferences.");
      }
    } catch (error) {
      console.error("Error loading events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [savedResponse, appliedResponse] = await Promise.all([
        supabase.from("saved_events").select("event_id").eq("user_id", user.id),
        supabase.from("applications").select("event_id").eq("user_id", user.id),
      ]);

      if (savedResponse.data) {
        setSavedEvents(new Set(savedResponse.data.map((s: SavedEvent) => s.event_id)));
      }

      if (appliedResponse.data) {
        setAppliedEvents(new Set(appliedResponse.data.map((a: Application) => a.event_id)));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleSave = async (eventId: string) => {
    if (!user) return;

    try {
      if (savedEvents.has(eventId)) {
        await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);

        setSavedEvents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        await supabase.from("saved_events").insert({
          user_id: user.id,
          event_id: eventId,
        });

        setSavedEvents((prev) => new Set(prev).add(eventId));
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const addToGoogleCalendar = (event: Event) => {
    const eventDate = new Date(event.date);
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${eventDate
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0]}Z/${endDate
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0]}Z&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.location)}`;

    window.open(calendarUrl, "_blank");
  };

  const handleApply = async (eventId: string, event: Event) => {
    if (!user || appliedEvents.has(eventId)) return;

    try {
      await supabase.from("applications").insert({
        user_id: user.id,
        event_id: eventId,
        status: "applied",
      });

      setAppliedEvents((prev) => new Set(prev).add(eventId));
      addToGoogleCalendar(event);
    } catch (error) {
      console.error("Error applying to event:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setVisibleCards(new Set());
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setVisibleCards(new Set());
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
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <p className="text-gray-400 text-center mb-4">
              No upcoming events match your interests right now.
            </p>
            <p className="text-gray-500 text-sm text-center">
              Try updating your preferences to discover more events!
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-4 pb-4">
            {events
              .slice(
                currentPage * eventsPerPage,
                (currentPage + 1) * eventsPerPage
              )
              .map((event, index) => {
                const isSaved = savedEvents.has(event.id);
                const isApplied = appliedEvents.has(event.id);
                const isVisible = visibleCards.has(`event-${event.id}`);

                return (
                  <div
                    key={event.id}
                    id={`event-${event.id}`}
                    data-event-card
                    className={`bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-700 ${
                      isVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-6"
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
                          className={`w-5 h-5 ${
                            isSaved
                              ? "fill-[#4C6EF5] text-[#4C6EF5]"
                              : "text-white"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {event.title}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {event.organization}
                        </p>
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2">
                        {event.description}
                      </p>

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
                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                : "bg-[#0B0C10] text-white border border-gray-700 hover:border-gray-600"
                            }`}
                          >
                            {isApplied ? (
                              "Applied"
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

            {/* Pagination */}
            {events.length > eventsPerPage && (
              <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
                <p className="text-gray-400 text-sm">
                  Page {currentPage + 1} of{" "}
                  {Math.ceil(events.length / eventsPerPage)}
                </p>
                <div className="flex justify-center gap-3">
                  {currentPage > 0 && (
                    <button
                      onClick={handlePreviousPage}
                      className="bg-[#1a1d29] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#252837] transition-colors border border-gray-700"
                    >
                      Previous Page
                    </button>
                  )}
                  {(currentPage + 1) * eventsPerPage < events.length && (
                    <button
                      onClick={handleNextPage}
                      className="bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Next Page
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
