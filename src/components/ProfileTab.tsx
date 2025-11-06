import { useEffect, useState } from "react";
import { Camera, Bell, Bookmark, Settings } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface ProfileTabProps {
  onEditPreferences: () => void;
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "saved">("notifications");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadNotifications();
      loadSavedEvents();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, created_at")
      .eq("id", user.id)
      .single();
    setProfile(data);
  };

  const loadNotifications = async () => {
    // temporary mock notifications — later link to event system
    setNotifications([
      { id: 1, title: "🎉 New event: TechX McGill 2025", date: "Nov 8" },
      { id: 2, title: "Reminder: AI & Ethics Panel tomorrow", date: "Nov 7" },
    ]);
  };

  const loadSavedEvents = async () => {
    const { data } = await supabase
      .from("saved_events")
      .select("event_id, events(title, date)")
      .eq("user_id", user.id);
    setSavedEvents(data || []);
  };

  const handleAvatarChange = () => {
    alert("Profile picture upload coming soon 🚀");
  };

  const formatMemberSince = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-white pb-24">
      {/* Cover section */}
      <div className="relative bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] h-44">
        <div className="absolute inset-0 opacity-40 bg-[url('/wave-pattern.svg')] bg-cover" />
        <div className="absolute top-4 right-4">
          <Settings className="w-6 h-6 text-white/80 hover:text-white transition" />
        </div>
      </div>

      {/* Profile photo */}
      <div className="relative -mt-16 flex flex-col items-center">
        <div className="relative">
          <img
            src={profile?.avatar_url || "https://via.placeholder.com/100"}
            alt="Profile"
            className="w-28 h-28 rounded-full border-4 border-[#0B0C10] object-cover shadow-lg"
          />
          <button
            onClick={handleAvatarChange}
            className="absolute bottom-1 right-1 bg-[#00BFFF] p-2 rounded-full shadow hover:bg-[#1EC8FF] transition"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          {profile?.full_name || "User"}
        </h2>
        <p className="text-gray-400 text-sm">
          Member since {formatMemberSince(profile?.created_at)}
        </p>
      </div>

      {/* Edit buttons */}
      <div className="flex flex-col items-center gap-3 mt-4">
        {/* Edit Profile */}
        <button
          onClick={() => alert("Profile editing coming soon!")}
          className="w-44 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          Edit Profile
        </button>

        {/* Edit Preferences — functional */}
        <button
          onClick={onEditPreferences}
          className="w-44 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] text-white font-medium py-2.5 rounded-xl shadow-[0_0_15px_rgba(0,191,255,0.3)] hover:shadow-[0_0_25px_rgba(0,191,255,0.6)] hover:scale-[1.03] active:scale-[1.00] transition-all"
        >
          Edit Preferences
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex justify-center gap-10 border-b border-white/10">
        <button
          className={`pb-3 text-sm font-medium ${
            activeTab === "notifications"
              ? "text-[#00BFFF] border-b-2 border-[#00BFFF]"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell className="inline w-4 h-4 mr-1" /> Notifications
        </button>
        <button
          className={`pb-3 text-sm font-medium ${
            activeTab === "saved"
              ? "text-[#00BFFF] border-b-2 border-[#00BFFF]"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("saved")}
        >
          <Bookmark className="inline w-4 h-4 mr-1" /> Saved
        </button>
      </div>

      {/* Content */}
      <div className="px-6 mt-6 space-y-4">
        {activeTab === "notifications" ? (
          notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-gray-400 mt-1">{n.date}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center">No new notifications</p>
          )
        ) : savedEvents.length > 0 ? (
          savedEvents.map((s) => (
            <div
              key={s.event_id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
            >
              <p className="font-medium">{s.events.title}</p>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(s.events.date).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center">No saved events yet</p>
        )}
      </div>
    </div>
  );
}
