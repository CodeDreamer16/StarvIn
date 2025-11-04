import { useState, useEffect } from 'react';
import { Calendar, MapPin, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Application {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
  events: {
    title: string;
    description: string;
    event_type: string;
    organization: string;
    location: string;
    date: string;
    image_url: string;
    prize: string;
    tags: string[];
  };
}

export function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          id,
          event_id,
          status,
          created_at,
          events (
            title,
            description,
            event_type,
            organization,
            location,
            date,
            image_url,
            prize,
            tags
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as Application[]) || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-white mb-1">Applications</h1>
        <p className="text-gray-400">Track your event applications</p>
      </div>

      {applications.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="bg-[#1a1d29] rounded-3xl p-12 border border-gray-800">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">No applications yet</h3>
            <p className="text-gray-400">
              Start exploring events and apply to ones that interest you
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {applications.map((application) => {
            const event = application.events;
            return (
              <div
                key={application.id}
                className="bg-[#1a1d29] rounded-3xl overflow-hidden border border-gray-800"
              >
                <div
                  className="h-40 bg-cover bg-center relative"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${event.image_url})`,
                  }}
                >
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#4C6EF5] text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {event.event_type}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status.charAt(0).toUpperCase() +
                        application.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                    <p className="text-gray-400 text-sm">{event.organization}</p>
                  </div>

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

                  <div className="pt-2 text-xs text-gray-500">
                    Applied {formatDate(application.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
