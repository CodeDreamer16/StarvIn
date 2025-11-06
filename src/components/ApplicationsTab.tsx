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
      <div className="flex items-center justify
