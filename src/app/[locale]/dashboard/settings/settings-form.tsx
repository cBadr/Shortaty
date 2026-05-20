"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound } from "lucide-react";
import { changePassword, updateProfile } from "./actions";

interface Profile {
  email: string;
  full_name: string | null;
  language: string;
  role: string;
  created_at: string;
}

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile(fd);
      if (res.error) return setProfileMsg({ kind: "err", text: res.error });
      setProfileMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    });
  }

  function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMsg(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await changePassword(fd);
      if (res.error) return setPwMsg({ kind: "err", text: res.error });
      setPwMsg({ kind: "ok", text: "Password updated." });
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={onProfile} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            value={profile?.email ?? ""}
            disabled
            className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default language</label>
          <select
            name="language"
            defaultValue={profile?.language ?? "ar"}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="text-xs text-muted-foreground">
          Role: <span className="font-mono">{profile?.role}</span> · Member since{" "}
          {profile ? new Date(profile.created_at).toLocaleDateString() : "—"}
        </div>
        {profileMsg && (
          <p className={`text-sm ${profileMsg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {profileMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-md text-sm"
        >
          <Save className="size-4" /> Save
        </button>
      </form>

      <form onSubmit={onPassword} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        {pwMsg && (
          <p className={`text-sm ${pwMsg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-md text-sm"
        >
          <KeyRound className="size-4" /> Update password
        </button>
      </form>
    </div>
  );
}
