import { useState, useEffect, useRef, useMemo } from "react";
import { Calendar, MapPin, Bookmark, Send, Eye } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { EventModal } from "./EventModal";
import { SkeletonCard } from "./SkeletonCard";

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

interface SavedEvent {
  event_id: string;
}
interface Application {
  event_id: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Career & Professional Development": [
    "career", "job", "internship", "resume", "linkedin", "network", "employer", "career planning",
  ],
  "Wellness & Mental Health": [
    "wellness", "mental", "therapy", "stress", "health", "mindfulness", "support", "care",
  ],
  "Workshops & Skill Building": [
    "workshop", "training", "learn", "skillsets", "tutorial", "seminar", "session",
  ],
  "Social & Community Events": [
    "social", "community", "mixer", "connect", "meetup", "hangout",
  ],
  "International Student Services": [
    "international", "immigration", "iss", "visa", "global", "orientation",
  ],
  "Leadership & Personal Growth": [
    "leadership", "mindset", "growth", "development", "imposter",
  ],
};

const stripHTML = (html?: string | null) =>
  (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const normalize = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function relevanceScore(ev: Event, interests: string[]) {
  const text = normalize(
    `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ""} ${ev.organization ?? ""}`
  );
  let score = 0;
  for (const interest of interests) {
    const kws = CATEGORY_KEYWORDS[interest] ?? [];
    for (const kw of kws) if (text.includes(normalize(kw))) score += 3;
  }
  const d = new Date(ev.date).getTime();
  if (!Number.isNaN(d)) score += Math.max(0, 1_000_000_000_000 - (Date.now() - d)) / 1e12;
  return score;
}

export function FeedTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [appliedEvents, setAppliedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fadeState, setFadeState] = useState<"fade-in" | "fade-out">("fade-in");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const eventsPerPage = 10;

  useEffect(() => {
    loadEventsWithPreferences();
    loadUserData();
  }, [user]);

  const handlePageChange = (newPage: number) => {
    setFadeState("fade-out");
    setTimeout(() => {
      setCurrentPage(newPage);
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setVisibleCards(new Set());
      setFadeState("fade-in");
    }, 500);
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("id") ?? "";
          if (entry.isIntersecting && id)
            setVisibleCards((p) => new Set(p).add(id));
        });
      },
      { threshold: 0.15, rootMargin: "100px" }
    );
    document
      .querySelectorAll("[data-event-card]")
      .forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [events, currentPage]);

  const loadUserData = async () => {
    if (!user) return;
    const [saved, applied] = await Promise.all([
      supabase.from("saved_events").select("event_id").eq("user_id", user.id),
      supabase.from("applications").select("event_id").eq("user_id", user.id),
    ]);
    if (saved.data) setSavedEvents(new Set(saved.data.map((x: SavedEvent) => x.event_id)));
    if (applied.data)
      setAppliedEvents(new Set(applied.data.map((x: Application) => x.event_id)));
  };

  const loadEventsWithPreferences = async () => {
    setLoading(true);
    try {
      if (!user) return;
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("interest_name")
        .eq("user_id", user.id);
      const interests = (prefs ?? []).map((p) => p.interest_name);
      const { data: allEvents } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      const now = new Date();
      const upcoming = (allEvents ?? []).filter((e) => new Date(e.date) >= now);

      const filtered = interests.length
        ? upcoming.filter((ev) => {
            const text = normalize(
              `${ev.title} ${stripHTML(ev.description)} ${ev.event_type ?? ""} ${ev.organization ?? ""}`
            );
            return interests.some((i) => {
              const kws = CATEGORY_KEYWORDS[i] ?? [];
              return kws.some((k) => text.includes(normalize(k)));
            });
          })
        : upcoming;

      const ranked = filtered
        .map((e) => ({ e, score: relevanceScore(e, interests) }))
        .sort((a, b) => b.score - a.score)
        .map(({ e }) => e);

      setEvents(ranked);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    if (!user) return;
    if (savedEvents.has(id)) {
      await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", id);
      setSavedEvents((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    } else {
      await supabase.from("saved_events").insert({ user_id: user.id, event_id: id });
      setSavedEvents((p) => new Set(p).add(id));
    }
  };

  const handleApply = async (id: string, ev: Event) => {
    if (!user || appliedEvents.has(id)) return;
    await supabase.from("applications").insert({ user_id: user.id, event_id: id });
    setAppliedEvents((p) => new Set(p).add(id));
    const start = new Date(ev.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ev.title
    )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
      stripHTML(ev.description)
    )}`;
    window.open(url, "_blank");
  };

  const openModal = (ev: Event) => {
    setSelectedEvent(ev);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 250);
  };

  const totalPages = useMemo(() => Math.ceil(events.length / eventsPerPage), [events]);
  const pageSlice = useMemo(() => {
    const start = currentPage * eventsPerPage;
    return events.slice(start, start + eventsPerPage);
  }, [events, currentPage]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24 bg-[#0B0C10]">
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-10 pb-12 bg-[#0B0C10]/80 backdrop-blur z-10">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-20 w-96 h-96 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-20 blur-3xl rounded-full animate-blob" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-2xl rounded-full animate-blob animation-delay-2000" />
          </div>

          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent animate-pulse-slow mb-3">
              Discover
            </h1>
            <p className="text-gray-400 text-lg">Find events that match your interests</p>
            <div className="mt-6 h-[1px] w-48 mx-auto bg-gradient-to-r from-[#00BFFF]/0 via-[#00BFFF]/60 to-[#00BFFF]/0 rounded-full" />
          </div>
        </div>

        {/* Events */}
        {loading ? (
          <div className="px-6 py-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            No matching events found.
          </div>
        ) : (
          <div
            className={`px-6 py-8 grid grid-cols-1 sm:grid-cols-2 gap-6 transition-opacity duration-500 ${
              fadeState === "fade-in" ? "opacity-100" : "opacity-0"
            }`}
          >
            {pageSlice.map((ev, idx) => {
              const isSaved = savedEvents.has(ev.id);
              const isApplied = appliedEvents.has(ev.id);
              const id = `event-${ev.id}`;
              const visible = visibleCards.has(id);
              const bg = ev.image_url
                ? `url(${ev.image_url})`
                : "linear-gradient(135deg, #4C6EF5 0%, #7C3AED 100%)";

              return (
                <div
                  key={ev.id}
                  id={id}
                  data-event-card
                  className={`relative rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md
                    bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]
                    transform transition-all duration-500
                    hover:scale-[1.03] hover:shadow-[0_10px_35px_rgba(0,191,255,0.35)]
                    hover:border-[#00BFFF]/50
                    ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{
                    transitionDelay: `${idx * 60}ms`,
                    backgroundImage: bg,
                    backgroundSize: ev.image_url ? "cover" : "auto",
                    backgroundPosition: "center",
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
                        <Calendar className="w-4 h-4" /> <span>{formatDate(ev.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <MapPin className="w-4 h-4" /> <span>{ev.location ?? "McGill University"}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => openModal(ev)}
                        className="w-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] hover:opacity-90 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                      <button
                        onClick={() => handleApply(ev.id, ev)}
                        disabled={isApplied}
                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                          ${
                            isApplied
                              ? "bg-white/10 text-gray-400 cursor-not-allowed"
                              : "bg-black/40 hover:bg-black/60 text-white"
                          }`}
                      >
                        <Send className="w-4 h-4" /> {isApplied ? "Applied" : "Apply"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(ev.id)}
                    className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-300 
                      ${
                        savedEvents.has(ev.id)
                          ? "bg-[#00BFFF]/20 hover:bg-[#00BFFF]/30"
                          : "bg-black/40 hover:bg-black/70 backdrop-blur-sm"
                      }`}
                  >
                    <Bookmark
                      className={`w-5 h-5 transition-transform duration-300 
                        ${
                          savedEvents.has(ev.id)
                            ? "fill-[#00BFFF] text-[#00BFFF] scale-110"
                            : "text-white scale-100"
                        }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pb-6">
            {currentPage > 0 && (
              <button
                onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                className="bg-white/5 text-white px-5 py-3 rounded-xl hover:bg-white/10 transition"
              >
                Previous
              </button>
            )}
            <p className="text-gray-400 text-sm">
              Page {currentPage + 1} of {totalPages}
            </p>
            {currentPage + 1 < totalPages && (
              <button
                onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] text-white px-6 py-3 rounded-xl hover:opacity-90 transition"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
