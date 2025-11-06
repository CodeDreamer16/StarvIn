import { useEffect, useState, useRef } from "react";
import {
  Camera,
  Bell,
  Settings,
  LogOut,
  Upload,
  Trash2,
  Eye,
  CheckCircle,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/847/847969.png";

interface ProfileTabProps {
  onEditPreferences: () => void;
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user, signOut: contextSignOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const settingsRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;
    const cachedAvatar = localStorage.getItem(`avatar_url_${user.id}`);
    if (cachedAvatar) {
      setProfile((prev: any) => ({ ...prev, avatar_url: cachedAvatar }));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setShowSettings(false);
      if (cameraRef.current && !cameraRef.current.contains(e.target as Node))
        setShowCameraMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();
    if (error) return console.error("Error loading profile:", error.message);

    if (!data) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert([{ id: user.id, full_name: user.email?.split("@")[0] }]);
      if (insertError) console.error("Error creating profile:", insertError.message);
      setProfile({ full_name: user.email?.split("@")[0], avatar_url: null });
      return;
    }

    setProfile(data);
    if (data.avatar_url)
      localStorage.setItem(`avatar_url_${user.id}`, data.avatar_url);
  };

  const loadNotifications = async () => {
    setNotifications([
      { id: 1, title: "🎉 New event: TechX McGill 2025", date: "Nov 8" },
      { id: 2, title: "Reminder: AI & Ethics Panel tomorrow", date: "Nov 7" },
    ]);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);

      setProfile((p: any) => ({ ...p, avatar_url: data.publicUrl }));
      localStorage.setItem(`avatar_url_${user.id}`, data.publicUrl);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 1200);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setShowCameraMenu(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      setProfile((p: any) => ({ ...p, avatar_url: null }));
      localStorage.removeItem(`avatar_url_${user.id}`);
      setShowCameraMenu(false);
    } catch {
      alert("Failed to remove photo.");
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (contextSignOut) await contextSignOut();
      window.location.reload();
    } catch {
      alert("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const avatarSrc =
    profile?.avatar_url ||
    localStorage.getItem(`avatar_url_${user?.id}`) ||
    DEFAULT_AVATAR;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-white pb-24">

      {/* 🖼️ Animated Banner */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-r from-[#00BFFF] via-[#4C6EF5] to-[#00BFFF] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0B0C10]/80 z-0" />

        {/* Floating Icons */}
        <div className="absolute inset-0 opacity-40 z-0 pointer-events-none">
          <span className="absolute text-white/30 text-xl animate-float-slow" style={{ top: "20%", left: "10%" }}>🎓</span>
          <span className="absolute text-white/30 text-xl animate-float-slow2" style={{ top: "40%", left: "30%" }}>📅</span>
          <span className="absolute text-white/30 text-xl animate-float-slow3" style={{ top: "25%", right: "20%" }}>🏆</span>
          <span className="absolute text-white/30 text-xl animate-float-slow4" style={{ top: "50%", right: "10%" }}>📍</span>
        </div>

        {/* Tagline */}
        <div className="absolute inset-0 flex items-center justify-center text-center z-10">
          <h1
            className="text-2xl font-semibold text-white/25 tracking-wide select-none font-[Poppins]"
            style={{
              textShadow:
                "0 0 15px rgba(0,191,255,0.35), 0 0 25px rgba(76,110,245,0.3)",
              letterSpacing: "0.05em",
            }}
          >
            Discover. Connect. Vybe.
          </h1>
        </div>

        {/* ⚙️ Settings */}
        <div className="absolute top-4 right-4 z-20" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="transition-transform duration-300 hover:rotate-90 active:rotate-180"
          >
            <Settings className="w-6 h-6 text-white/80 hover:text-white transition" />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-3 w-44 bg-[#1a1d29]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg overflow-hidden animate-fadeIn z-50">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-red-500/10 text-red-400 transition disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 👤 Profile Photo */}
      <div className="relative -mt-16 flex flex-col items-center z-20">
        <div className="relative group" ref={cameraRef}>
          <img
            src={avatarSrc}
            alt="Profile"
            className="w-28 h-28 rounded-full border-4 border-[#0B0C10] object-cover shadow-lg transition-all duration-300 z-20"
          />

          {uploadSuccess && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="absolute inset-0 rounded-full bg-[#00FFAA]/15 animate-pulse" />
              <CheckCircle className="w-7 h-7 text-[#00FFAA] opacity-90 animate-fadeIn" />
            </div>
          )}

          <button
            onClick={() => setShowCameraMenu(!showCameraMenu)}
            disabled={uploading}
            className="absolute bottom-1 right-1 bg-[#00BFFF] p-2 rounded-full shadow hover:bg-[#1EC8FF] transition flex items-center justify-center z-30"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>

          {showCameraMenu && (
            <div className="absolute bottom-12 right-0 w-48 bg-[#1a1d29]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg overflow-hidden animate-fadeIn z-50 text-[13px]">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition text-gray-200"
              >
                <Upload className="w-4 h-4 text-[#00BFFF]" />
                Upload Photo
              </button>
              <button
                onClick={() => {
                  setShowAvatarModal(true);
                  setShowCameraMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition text-gray-200"
              >
                <Eye className="w-4 h-4 text-[#4C6EF5]" />
                View Photo
              </button>
              <button
                onClick={handleRemoveAvatar}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-red-500/10 text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
                Remove Photo
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
