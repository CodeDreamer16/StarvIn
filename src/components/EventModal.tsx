import { X, Calendar, MapPin, Award, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type?: string;
  organization?: string;
  location?: string;
  date: string;
  deadline?: string | null;
  image_url?: string | null;
  prize?: string;
  tags?: string[];
  link?: string | null;
}

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventModal({ event, isOpen, onClose }: EventModalProps) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-default"
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-800 bg-[#1a1d29] shadow-2xl animate-slideUp"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {event.image_url ? (
          <div
            className="relative h-56 w-full bg-cover bg-center md:h-64"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
            }}
          >
            <div className="absolute bottom-4 left-6">
              {event.event_type && (
                <span className="rounded-full bg-[#4C6EF5] px-4 py-1.5 text-sm font-semibold text-white shadow-md">
                  {event.event_type}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-20 w-full bg-gradient-to-r from-[#00BFFF]/30 to-[#4C6EF5]/20 flex items-center justify-start px-6">
            {event.event_type && (
              <span className="rounded-full bg-[#4C6EF5]/80 px-4 py-1.5 text-sm font-semibold text-white shadow-md">
                {event.event_type}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-white">{event.title}</h2>
              {event.organization && (
                <p className="text-lg text-gray-400">{event.organization}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-gray-300">
                <Calendar className="mt-0.5 h-5 w-5 text-[#4C6EF5]" />
                <span>{formatDate(event.date)}</span>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <MapPin className="mt-0.5 h-5 w-5 text-[#4C6EF5]" />
                <span>{event.location}</span>
              </div>

              {event.prize && (
                <div className="flex items-start gap-3 font-medium text-[#4C6EF5]">
                  <Award className="mt-0.5 h-5 w-5" />
                  <span>{event.prize}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-6">
              <h3 className="mb-3 text-lg font-semibold text-white">About This Event</h3>
              <p className="whitespace-pre-line leading-relaxed text-gray-300">
                {event.description}
              </p>
            </div>

            {event.tags?.length > 0 && (
              <div className="border-t border-gray-800 pt-6">
                <h3 className="mb-3 text-lg font-semibold text-white">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="rounded-full bg-gray-800 px-4 py-1.5 text-sm text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.link && (
              <div className="border-t border-gray-800 pt-6">
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] py-4 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-5 w-5" />
                  Open in Browser
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
