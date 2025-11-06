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
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/847/847969.png";
const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1520975922071-c0b4b9e3da9a?auto=format&fit=crop&w=1350&q=80";

interface ProfileTabProps {
  onEditPreferences: () => void;
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user, signOut: contextSignOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showBannerMenu, setShowBannerMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [bannerSuccess, setBannerSuccess] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);

  const settingsRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // 🚀 Load cached avatar & banner instantly
  useEffect(() => {
    if (!user) return;
    const cachedAvatar = localStorage.getItem(`avatar_url_${user.id}`);
    const cachedBanner = localStorage.getItem(`banner_url_${user.id}`);
    setProfile((prev: any) => ({
      ...prev,
      avatar_url: cachedAvatar || prev?.avatar_url,
      banner_url: cachedBanner || prev?.banner_url,
    }));
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
      if (bannerRef.current && !bannerRef.current.contains(e.target as Node))
        setShowBannerMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, banner_url")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error.message);
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert([{ id: user.id, full_name: user.email?.split("@")[0] }]);
      if (insertError)
        console.error("Error creating profile:", insertError.message);
      setProfile({ full_name: user.email?.split("@")[0], avatar_url: null });
      return;
    }

    setProfile(data);
    if (data.avatar_url)
      localStorage.setItem(`avatar_url_${user.id}`, data.avatar_url);
    if (data.banner_url)
      localStorage.setItem(`banner_url_${user.id}`, data.banner_url);
  };

  const loadNotifications = async () => {
    setNotifications([
      { id: 1, title: "🎉 New event: TechX McGill 2025", date: "Nov 8" },
      { id: 2, title: "Reminder: AI & Ethics Panel tomorrow", date: "Nov 7" },
    ]);
  };

  const uploadToStorage = async (bucket: string, file: File, key: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${key}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setUploading(true);
      const publicUrl = await uploadToStorage("avatars", file, "avatars");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));
      localStorage.setItem(`avatar_url_${user.id}`, publicUrl);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 1200);
    } catch (err) {
      console.error(err);
      alert("Failed to upload avatar.");
    } finally {
      setUploading(false);
      setShowCameraMenu(false);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setUploading(true);
      const publicUrl = await uploadToStorage("banners", file, "banners");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ banner_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setProfile((p: any) => ({ ...p, banner_url: publicUrl }));
      localStorage.setItem(`banner_url_${user.id}`, publicUrl);

      setBannerSuccess(true);
      setTimeout(() => setBannerSuccess(false), 1200);
    } catch (err) {
      console.error(err);
      alert("Failed to upload banner.");
    } finally {
      setUploading(false);
      setShowBannerMenu(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banner_url: null })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p: any) => ({ ...p, banner_url: null }));
      localStorage.removeItem(`banner_url_${user.id}`);
      setShowBannerMenu(false);
    } catch (err) {
      console.error(err);
      alert("Failed to remove banner.");
    }
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
      alert("Failed to sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  const avatarSrc =
    profile?.avatar_url ||
    localStorage.getItem(`avatar_url_${user?.id}`) ||
    DEFAULT_AVATAR;
  const bannerSrc =
    profile?.banner_url ||
    localStorage.getItem(`banner_url_${user?.id}`) ||
    DEFAULT_BANNER;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-white pb-24">
      {/* 🖼️ Banner */}
      <div
        className="relative h-44 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] group"
        ref={bannerRef}
      >
        <img
          src={bannerSrc}
          alt="Banner"
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0B0C10]/80" />

        {/* 📷 Banner Controls */}
        <button
          onClick={() => setShowBannerMenu(!showBannerMenu)}
          disabled={uploading}
          className="absolute bottom-3 right-3 bg-[#00BFFF]/80 hover:bg-[#1EC8FF] p-2 rounded-full shadow flex items-center justify-center transition"
        >
          <ImageIcon className="w-5 h-5 text-white" />
        </button>

        {showBannerMenu && (
          <div className="absolute bottom-14 right-3 w-48 bg-[#1a1d29]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg overflow-hidden animate-fadeIn z-50 text-[13px]">
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition text-gray-200"
            >
              <Upload className="w-4 h-4 text-[#00BFFF]" />
              Upload Banner
            </button>
            <button
              onClick={() => {
                setShowBannerModal(true);
                setShowBannerMenu(false);
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition text-gray-200"
            >
              <Eye className="w-4 h-4 text-[#4C6EF5]" />
              View Banner
            </button>
            <button
              onClick={handleRemoveBanner}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-red-500/10 text-red-400 transition"
            >
              <Trash2 className="w-4 h-4" />
              Remove Banner
            </button>
          </div>
        )}

        {bannerSuccess && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#00FFAA]/10 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-4 h-4 text-[#00FFAA]" />
            <span className="text-sm text-[#00FFAA]">Banner updated</span>
          </div>
        )}

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerChange}
          className="hidden"
        />

        {/* ⚙️ Settings */}
        <div className="absolute top-4 right-4" ref={settingsRef}>
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

      {/* ✅ Avatar section remains unchanged */}
      <div className="relative -mt-16 flex flex-col items-center">
        <div className="relative group" ref={cameraRef}>
          <img
            src={avatarSrc}
            alt="Profile"
            className="w-28 h-28 rounded-full border-4 border-[#0B0C10] object-cover shadow-lg transition-all duration-300"
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
            className="absolute bottom-1 right-1 bg-[#00BFFF] p-2 rounded-full shadow hover:bg-[#1EC8FF] transition flex items-center justify-center z-10"
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
                onClick={async () => {
                  await supabase
                    .from("profiles")
                    .update({ avatar_url: null })
                    .eq("id", user.id);
                  localStorage.removeItem(`avatar_url_${user.id}`);
                  setProfile((p: any) => ({ ...p, avatar_url: null }));
                  setShowCameraMenu(false);
                }}
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

        <h2 className="mt-3 text-2xl font-semibold">
          {profile?.full_name || user?.email?.split("@")[0] || "User"}
        </h2>
        <p className="text-gray-400 text-sm">
          Signed in as {user?.email || "—"}
        </p>
      </div>

      {/* 🔔 Notifications */}
      <div className="mt-8 flex justify-center gap-10 border-b border-white/10">
        <button className="pb-3 text-sm font-medium text-[#00BFFF] border-b-2 border-[#00BFFF]">
          <Bell className="inline w-4 h-4 mr-1" /> Notifications
        </button>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-gray-400 mt-1">{n.date}</p>
          </div>
        ))}
      </div>

      {/* 🖼️ Banner Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="relative bg-[#11121A]/90 rounded-3xl shadow-[0_0_20px_rgba(0,191,255,0.25)] p-4 w-[90vw] max-w-2xl h-[60vh] flex items-center justify-center border border-white/5">
            <img
              src={bannerSrc}
              alt="Banner zoom"
              className="w-full h-full object-cover rounded-2xl border border-white/5"
            />
            <button
              onClick={() => setShowBannerModal(false)}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {/* 🖼️ Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="relative bg-[#11121A]/90 rounded-3xl shadow-[0_0_20px_rgba(0,191,255,0.25)] p-4 w-72 h-72 flex items-center justify-center border border-white/5">
            <img
              src={avatarSrc}
              alt="Profile zoom"
              className="w-56 h-56 object-cover rounded-2xl border border-white/5"
            />
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
