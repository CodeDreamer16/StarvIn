import { X, Calendar, MapPin, Award, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

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

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventModal({ event, isOpen, onClose }: EventModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative bg-[#1a1d29] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div
          className="h-64 bg-cover bg-center relative rounded-t-3xl"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
          }}
        >
          <div className="absolute bottom-4 left-6">
            <span className="bg-[#4C6EF5] text-white px-4 py-1.5 rounded-full text-sm font-semibold">
              {event.event_type}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
            {event.organization && (
              <p className="text-gray-400 text-lg">{event.organization}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-gray-300">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#4C6EF5]" />
              <span>{formatDate(event.date)}</span>
            </div>

            <div className="flex items-start gap-3 text-gray-300">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#4C6EF5]" />
              <span>{event.location}</span>
            </div>

            {event.prize && (
              <div className="flex items-start gap-3 text-[#4C6EF5] font-medium">
                <Award className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{event.prize}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">About This Event</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-800 text-gray-300 px-4 py-1.5 rounded-full text-sm"
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
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-5 h-5" />
                Open in Browser
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
