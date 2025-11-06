import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, MapPin, Eye, CheckCircle2 } from "lucide-react";
import { EventModal } from "./EventModal";

interface EventApplication {
  id: string;
  event_id: string;
  created_at: string;
  events: {
    id: string;
    title: string;
    organization: string | null;
    description: string | null;
    date: string;
    location: string | null;
    image_url: string | null;
  };
}

export function ApplicationsTab() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          event_id,
          created_at,
          events (
            id,
            title,
            organization,
            description,
            date,
            location,
            image_url
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
      // trigger smooth fade-in once content is loaded
      setTimeout(() => setFadeIn(true), 100);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const openModal = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 250);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading applications...
      </div>
    );

  if (!applications.length)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
        <CheckCircle2 className="w-10 h-10 mb-3 text-gray-500" />
        <p className="font-medium text-gray-300">No applications yet</p>
        <p className="text-sm text-gray-500">
          Apply to events to see them here.
        </p>
      </div>
    );

  return (
    <>
      <div
        className={`px-4 pt-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4 transform transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {applications.map((app, idx) => {
          const event = app.events;
          return (
            <div
              key={app.id}
              className={`bg-gradient-to-br from-[#10121A] to-[#1A1C24] border border-gray-800 rounded-2xl overflow-hidden 
              shadow-[0_4px_20px_rgba(0,0,0,0.3)]
              transform transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] 
              hover:shadow-[0_10px_35px_rgba(0,191,255,0.35)] hover:border-[#00BFFF]/40
              will-change-transform will-change-[box-shadow]
              ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{
                transitionDelay: `${idx * 60}ms`,
              }}
            >
              {event?.image_url && (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                  }}
                />
              )}

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {event?.title}
                    </h3>
                    {event?.organization && (
                      <p className="text-gray-400 text-sm">
                        {event.organization}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end text-sm font-medium text-[#00BFFF]">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Applied</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">
                  {event?.description?.replace(/<[^>]*>/g, "")}
                </p>

                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event?.date)}</span>
                  <MapPin className="w-4 h-4 ml-2" />
                  <span>{event?.location ?? "McGill University"}</span>
                </div>

                <button
                  onClick={() => openModal(event)}
                  className="w-full py-2 rounded-xl font-semibold flex items-center justify-center gap-2 
                  bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] text-white hover:opacity-90 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
