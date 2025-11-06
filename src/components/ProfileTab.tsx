import { useEffect, useState, useRef } from "react";
import { Camera, Bell, Bookmark, Settings, LogOut, User } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface ProfileTabProps {
  onEditPreferences: () => void;
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user, signOut: contextSignOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "saved">("notifications");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadNotifications();
      loadSavedEvents();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, created_at")
      .eq("id", user.id)
      .single();
    setProfile(data);
  };

  const loadNotifications = async () => {
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

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (contextSignOut) await contextSignOut();
      window.location.reload();
    } catch (err) {
      console.error("Sign out error:", err);
      alert("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const formatMemberSince = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-white pb-24">
      {/* Header / Cover */}
      <div className="relative bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] h-44">
        <div className="absolute inset-0 opacity-40 bg-[url('/wave-pattern.svg')] bg-cover" />

        {/* ⚙️ Settings Dropdown */}
        <div className="absolute top-4 right-4" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`transition-transform duration-300 hover:rotate-90 active:rotate-180`}
          >
            <Settings className="w-6 h-6 text-white/80 hover:text-white transition" />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-3 w-48 bg-[#1a1d29] border border-white/10 rounded-xl shadow-lg overflow-hidden animate-fadeIn z-50">
              <button
                onClick={() => {
                  setShowSettings(false);
                  alert("Profile editing coming soon!");
                }}
                className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-white/10 transition"
              >
                <User className="w-4 h-4 text-[#00BFFF]" />
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  onEditPreferences();
                }}
                className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-white/10 transition"
              >
                <Settings className="w-4 h-4 text-[#4C6EF5]" />
                Edit Preferences
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-red-500/10 text-red-400 transition disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          )}
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
        <h2 className="mt-3 text-2xl font-semibold">{profile?.full_name || "User"}</h2>
        <p className="text-gray-400 text-sm">
          Member since {formatMemberSince(profile?.created_at)}
        </p>
      </div>

      {/* Edit Preferences (Main section button) */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <button
          onClick={onEditPreferences}
          className="w-44 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,191,255,0.3)] hover:shadow-[0_0_25px_rgba(0,191,255,0.6)] hover:scale-[1.03] active:scale-[1.00] transition-all"
        >
          <Settings className="w-4 h-4" />
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
