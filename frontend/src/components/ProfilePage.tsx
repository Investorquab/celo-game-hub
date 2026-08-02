import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { signMessage } from "wagmi/actions";
import { usePlayerStore } from "@/lib/playerStore";
import { wagmiConfig } from "@/lib/wagmi";
import { buildUsernameMessage } from "@/lib/usernameMessage";
import { fetchUsernameNonce, setUsername as setUsernameApi } from "@/lib/relayerClient";
import { hydrateProfileFromBackend } from "@/lib/profileSync";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProfilePage() {
  const { address } = useAccount();
  const profile = usePlayerStore((s) => s.profile);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!profile || !address) {
    return <div className="glass-card p-6 text-sm text-arcade-muted">Loading profile...</div>;
  }

  async function saveUsername() {
    if (!address) return;
    const trimmed = draft.trim();
    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("3-20 characters, letters/numbers/underscore only.");
      setStatus("error");
      return;
    }

    try {
      setStatus("signing");
      setError(null);
      const nonce = await fetchUsernameNonce(address);
      const message = buildUsernameMessage({ address, username: trimmed, nonce });
      const signature = await signMessage(wagmiConfig, { message, account: address });

      setStatus("saving");
      await setUsernameApi({ address, username: trimmed, signature });

      await hydrateProfileFromBackend(address);
      setEditing(false);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to set username:", err);
      setError(err instanceof Error ? err.message : "Failed to set username");
      setStatus("error");
    }
  }

  const xpIntoLevel = profile.xp % 100;

  return (
    <div className="mx-auto max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card shadow-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-arcade-muted">Level {profile.level}</p>
            {editing ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="choose_a_username"
                  maxLength={20}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 font-display text-lg text-arcade-text outline-none focus:border-arcade-green/50"
                />
              </div>
            ) : (
              <h1 className="font-display text-2xl">
                {profile.username ?? shorten(profile.address)}
              </h1>
            )}
            <p className="mt-0.5 font-mono text-xs text-arcade-muted">{shorten(profile.address)}</p>
          </div>
          <div className="pill bg-arcade-green/10 text-arcade-green">{profile.xp} XP</div>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-arcade-green to-arcade-blue"
            initial={{ width: 0 }}
            animate={{ width: `${xpIntoLevel}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <div className="mt-4">
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={saveUsername}
                disabled={status === "signing" || status === "saving"}
                className="btn-primary text-xs disabled:opacity-60"
              >
                {status === "signing" ? "Confirm in wallet..." : status === "saving" ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  setStatus("idle");
                }}
                className="text-xs text-arcade-muted hover:text-arcade-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(profile.username ?? "");
                setEditing(true);
              }}
              className="text-xs text-arcade-muted transition hover:text-arcade-green"
            >
              {profile.username ? "Change username" : "Choose a username →"}
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 text-center">
          <Stat label="Wins" value={profile.wins} />
          <Stat label="Losses" value={profile.losses} />
          <Stat label="Draws" value={profile.draws} />
          <Stat label="Games" value={profile.gamesPlayed} />
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] py-3">
      <p className="font-display text-lg text-arcade-text">{value}</p>
      <p className="text-[11px] text-arcade-muted">{label}</p>
    </div>
  );
}
