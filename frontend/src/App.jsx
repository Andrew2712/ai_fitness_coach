import { useState, useEffect, useRef } from "react";

const API_URL = "https://aifitnesscoach-production-373b.up.railway.app";

const T = {
  bg:        "#f4f5f7",
  sidebar:   "#1a1f2e",
  sidebarHover: "#252c3f",
  card:      "#ffffff",
  border:    "#e2e6ed",
  text:      "#1a1f2e",
  muted:     "#6b7280",
  subtle:    "#9ca3af",
  blue:      "#0d6efd",
  blueLight: "#e8f0fe",
  green:     "#16a34a",
  greenLight:"#dcfce7",
  red:       "#dc2626",
  redLight:  "#fee2e2",
  amber:     "#d97706",
  amberLight:"#fef3c7",
  purple:    "#7c3aed",
  purpleLight:"#ede9fe",
  cyan:      "#0891b2",
  cyanLight: "#cffafe",
  orange:    "#ea580c",
  orangeLight:"#ffedd5",
  strava:    "#fc4c02",
  stravaLight:"#fff0eb",
};

function riskColor(v) {
  if (!v) return T.muted;
  const s = v.toString().toUpperCase();
  if (s.includes("HIGH") || s.includes("CRITICAL")) return T.red;
  if (s.includes("MODERATE") || s.includes("MEDIUM")) return T.amber;
  return T.green;
}
function fatigueInfo(v) {
  if (!v) return { label: "Unknown", color: T.muted, pct: 0 };
  const s = v.toString().toUpperCase();
  if (s.includes("HIGH"))   return { label: "High",   color: T.red,   pct: 85 };
  if (s.includes("MEDIUM") || s.includes("MODERATE")) return { label: "Medium", color: T.amber, pct: 52 };
  return { label: "Low", color: T.green, pct: 18 };
}
function healthColor(n) {
  if (n == null) return T.muted;
  if (n >= 70) return T.green;
  if (n >= 40) return T.amber;
  return T.red;
}
function healthLabel(n) {
  if (n == null) return "N/A";
  if (n >= 70) return "Good";
  if (n >= 40) return "Fair";
  return "Poor";
}
function seeded(seed, n, lo, hi) {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return lo + ((s >>> 0) / 0xffffffff) * (hi - lo);
  });
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function SparkLine({ data, color, h = 40, filled = true }) {
  if (!data || data.length < 2) return (
    <svg viewBox="0 0 300 40" width="100%" height={h} preserveAspectRatio="none">
      <line x1="0" y1={h / 2} x2="300" y2={h / 2} stroke={color} strokeWidth="1.5" opacity="0.3" strokeDasharray="4,4" />
    </svg>
  );
  const W = 300, mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${h - 4 - ((v - mn) / rng) * (h - 8)}`);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {filled && <polygon points={`0,${h} ${pts.join(" ")} ${W},${h}`} fill={color} opacity="0.12" />}
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkBar({ data, color, h = 44, labels }) {
  if (!data || !data.length) return (
    <svg viewBox="0 0 260 44" width="100%" height={h + (labels ? 14 : 0)} preserveAspectRatio="none">
      <text x="130" y="22" textAnchor="middle" fontSize="11" fill={T.muted} fontFamily="system-ui">No data</text>
    </svg>
  );
  const W = 260;
  const validData = data.map(v => (typeof v === "number" && isFinite(v) ? v : 0));
  const mx = Math.max(...validData) || 1;
  const gap = 3;
  const bw = Math.max(2, Math.floor((W - gap * (validData.length - 1)) / validData.length));
  const totalW = validData.length * (bw + gap) - gap;
  return (
    <svg viewBox={`0 0 ${totalW} ${h + (labels ? 14 : 0)}`} width="100%" height={h + (labels ? 14 : 0)} preserveAspectRatio="none">
      {validData.map((v, i) => {
        const bh = Math.max(3, (v / mx) * (h - 4));
        const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx="2" fill={color} opacity="0.85" />
            {labels && <text x={x + bw / 2} y={h + 12} textAnchor="middle" fontSize="9" fill={T.muted} fontFamily="system-ui">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Ring({ pct = 0, color, size = 72, stroke = 7, children }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let raf, t0 = null;
    const go = ts => { if (!t0) t0 = ts; const p = Math.min((ts - t0) / 800, 1); setAnim((1 - Math.pow(1 - p, 3)) * pct); if (p < 1) raf = requestAnimationFrame(go); };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(anim / 100) * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function StatusBar({ value }) {
  const segs = [
    { label: "Detraining",   color: "#94a3b8" },
    { label: "Recovery",     color: T.blue    },
    { label: "Productive",   color: T.green   },
    { label: "Peaking",      color: T.amber   },
    { label: "Overreaching", color: T.red     },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 2, borderRadius: 4, overflow: "hidden", height: 8, marginBottom: 6 }}>
        {segs.map(s => <div key={s.label} style={{ flex: 1, background: s.label === value ? s.color : s.color + "30" }} />)}
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {segs.map(s => <div key={s.label} style={{ flex: 1, fontSize: 9, color: s.label === value ? s.color : T.subtle, textAlign: "center", fontWeight: s.label === value ? 700 : 400, fontFamily: "system-ui" }}>{s.label}</div>)}
      </div>
    </div>
  );
}

function Card({ children, style: extra, accent }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.border}`, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...extra }}>
      {children}
    </div>
  );
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "system-ui" }}>{children}</div>;
}
function MetricLabel({ children }) {
  return <div style={{ fontSize: 11, color: T.muted, fontFamily: "system-ui", marginBottom: 2 }}>{children}</div>;
}
function BigNum({ children, color, size = 28 }) {
  return <div style={{ fontSize: size, fontWeight: 700, color: color || T.text, fontFamily: "'Nunito Sans', 'DM Sans', system-ui", lineHeight: 1.1 }}>{children}</div>;
}
function SubText({ children }) {
  return <div style={{ fontSize: 12, color: T.muted, fontFamily: "system-ui", marginTop: 2 }}>{children}</div>;
}
function Pill({ children, color, bg }) {
  return <span style={{ display: "inline-block", background: bg || color + "18", color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, fontFamily: "system-ui" }}>{children}</span>;
}

function StravaIcon({ size = 16, color = "#fc4c02" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

function ActivityTypeIcon({ type }) {
  const icons = { Run: "🏃", Ride: "🚴", Walk: "🚶", Hike: "🥾", Swim: "🏊", Workout: "🏋️" };
  return <span>{icons[type] || "⚡"}</span>;
}

// ── Full Strava Dashboard Card ─────────────────────────────────────────────────
function StravaDashboard({ authUser, stravaConnected, stravaData, stravaSyncing, onSync, onDisconnect, isMobile }) {
  const [view, setView] = useState("week"); // week | month | ytd | recent

  if (!stravaConnected) {
    return (
      <Card accent={T.border} style={{ marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <StravaIcon size={20} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Strava</span>
            </div>
            <SubText>Connect your Strava to see running & cycling data</SubText>
          </div>
          <button onClick={() => window.location.href = `${API_URL}/strava/login/${authUser.id}`}
            style={{ background: T.strava, border: "none", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <StravaIcon size={14} color="#fff" />
            Connect Strava
          </button>
        </div>
      </Card>
    );
  }

  const d = stravaData;
  if (!d) return (
    <Card accent={T.strava} style={{ marginBottom: isMobile ? 16 : 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StravaIcon size={18} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.strava }}>Strava Connected</span>
        </div>
        <button onClick={onSync} style={{ background: T.stravaLight, border: `1px solid ${T.strava}`, borderRadius: 8, padding: "8px 14px", color: T.strava, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {stravaSyncing ? "Syncing…" : "🔄 Load Data"}
        </button>
      </div>
    </Card>
  );

  const stats = view === "week" ? d.week : view === "month" ? d.month : null;

  return (
    <Card accent={T.strava} style={{ marginBottom: isMobile ? 16 : 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <StravaIcon size={20} />
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{d.athlete}</span>
            <span style={{ fontSize: 10, background: T.stravaLight, color: T.strava, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Connected</span>
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>
            {d.city}{d.city && d.country ? ", " : ""}{d.country} • {d.followers} followers • {d.following} following
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onSync} style={{ background: T.stravaLight, border: `1px solid ${T.strava}`, borderRadius: 8, padding: "6px 10px", color: T.strava, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {stravaSyncing ? "…" : "🔄"}
          </button>
          <button onClick={() => window.location.href = `${API_URL}/strava/login/${authUser.id}`}
            style={{ background: T.stravaLight, border: `1px solid ${T.strava}`, borderRadius: 8, padding: "6px 10px", color: T.strava, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Reconnect
          </button>
          <button onClick={onDisconnect}
            style={{ background: T.redLight, border: `1px solid ${T.red}`, borderRadius: 8, padding: "6px 10px", color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Disconnect
          </button>
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.bg, borderRadius: 8, padding: 4 }}>
        {[
          { id: "week",   label: "This Week" },
          { id: "month",  label: "This Month" },
          { id: "ytd",    label: "Year to Date" },
          { id: "recent", label: "Recent" },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", background: view === t.id ? T.card : "transparent", color: view === t.id ? T.strava : T.muted, fontSize: isMobile ? 10 : 12, fontWeight: view === t.id ? 700 : 400, cursor: "pointer", boxShadow: view === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Week / Month stats */}
      {(view === "week" || view === "month") && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { icon: "🏃", label: "Activities", val: `${stats.count}`, sub: `${stats.runs} runs${stats.rides ? ` • ${stats.rides} rides` : ""}` },
              { icon: "📍", label: "Distance",   val: `${stats.distance_km} km`, sub: `${stats.elevation_m}m elevation` },
              { icon: "⏱️", label: "Time",        val: `${stats.time_min} min`, sub: `${Math.floor(stats.time_min/60)}h ${Math.round(stats.time_min%60)}m` },
              { icon: "⚡", label: "Avg Pace",   val: stats.avg_pace_min_km ? `${stats.avg_pace_min_km} /km` : "—", sub: stats.avg_speed_kmh ? `${stats.avg_speed_kmh} km/h` : "" },
            ].map(m => (
              <div key={m.label} style={{ background: T.stravaLight, borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: T.strava }}>{m.val}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: T.subtle }}>{m.sub}</div>
              </div>
            ))}
          </div>
          {/* HR info if available */}
          {stats.avg_hr && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: T.redLight, borderRadius: 8, padding: "8px 12px", flex: 1 }}>
                <div style={{ fontSize: 11, color: T.muted }}>Avg Heart Rate</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.red }}>{stats.avg_hr} bpm</div>
              </div>
              {stats.max_hr && (
                <div style={{ background: T.redLight, borderRadius: 8, padding: "8px 12px", flex: 1 }}>
                  <div style={{ fontSize: 11, color: T.muted }}>Max Heart Rate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.red }}>{stats.max_hr} bpm</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* YTD stats */}
      {view === "ytd" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { icon: "🏃", label: "Total Runs",    val: `${d.ytd_runs}` },
              { icon: "📍", label: "Total Distance", val: `${d.ytd_km} km` },
              { icon: "⏱️", label: "Total Time",     val: `${d.ytd_time_h}h` },
              { icon: "⛰️", label: "Elevation",      val: `${d.ytd_elevation}m` },
            ].map(m => (
              <div key={m.label} style={{ background: T.stravaLight, borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: T.strava }}>{m.val}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: T.stravaLight, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>All-Time Stats</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.strava }}>{d.all_runs}</div>
                <div style={{ fontSize: 11, color: T.muted }}>Total Runs</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.strava }}>{d.all_km} km</div>
                <div style={{ fontSize: 11, color: T.muted }}>Total Distance</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent activities */}
      {view === "recent" && d.recent && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {d.recent.map((act, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: T.stravaLight, borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.strava + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                <ActivityTypeIcon type={act.type} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{act.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{act.date} • {act.type}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.strava }}>{act.distance_km} km</div>
                <div style={{ fontSize: 11, color: T.muted }}>{act.time_min} min</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: T.amber }}>⛰️ {act.elevation_m}m</div>
                <div style={{ fontSize: 11, color: T.muted }}>👏 {act.kudos}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FeedbackWidget({ userId, goalName, onDone }) {
  const [sel, setSel] = useState(null), [comment, setComment] = useState(""), [sent, setSent] = useState(false), [busy, setBusy] = useState(false);
  const opts = [{ r: 1, e: "✓", l: "Yes" }, { r: 2, e: "~", l: "Partially" }, { r: 3, e: "✗", l: "No" }];
  const submit = async () => {
    if (!sel) return; setBusy(true);
    try { await fetch(`${API_URL}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: String(userId), rating: sel, goal: goalName || "Unknown", comment }) }); } catch {}
    setSent(true); setBusy(false); setTimeout(() => onDone?.(), 1400);
  };
  if (sent) return <div style={{ textAlign: "center", padding: 24, color: T.green, fontSize: 14, fontWeight: 600 }}>✓ Feedback saved</div>;
  return (
    <Card>
      <MetricLabel>DID YOU FOLLOW THE PLAN?</MetricLabel>
      <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
        {opts.map(o => (
          <button key={o.r} onClick={() => setSel(o.r)} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, cursor: "pointer", background: sel === o.r ? T.blueLight : T.bg, border: `1px solid ${sel === o.r ? T.blue : T.border}`, color: sel === o.r ? T.blue : T.muted, fontSize: 11, fontFamily: "system-ui" }}>
            <div style={{ fontSize: 16, marginBottom: 3 }}>{o.e}</div>{o.l}
          </button>
        ))}
      </div>
      <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional comment…" style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 12, marginBottom: 10, boxSizing: "border-box", fontFamily: "system-ui", outline: "none" }} />
      <button onClick={submit} disabled={!sel || busy} style={{ width: "100%", background: sel ? T.blue : T.border, border: "none", borderRadius: 8, padding: 11, color: sel ? "#fff" : T.muted, fontFamily: "system-ui", fontSize: 13, fontWeight: 600, cursor: sel ? "pointer" : "not-allowed" }}>{busy ? "Saving…" : "Submit Feedback"}</button>
    </Card>
  );
}

function AuthPage({ onLogin }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email || !password) { setErr("Please fill in all fields"); return; }
    if (mode === "register" && !username) { setErr("Please enter a username"); return; }
    setBusy(true); setErr("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { email, username, password };
      const r = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Something went wrong");
      localStorage.setItem("acoach_token", d.token);
      localStorage.setItem("acoach_user", JSON.stringify(d.user));
      onLogin(d.user, d.token);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.sidebar, display: "flex", flexDirection: isMobile ? "column" : "row", fontFamily: "system-ui" }}>
      {!isMobile && (
        <div style={{ width: "55%", background: `linear-gradient(135deg, #0d6efd22 0%, transparent 60%), ${T.sidebar}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 48, position: "relative", overflow: "hidden" }}>
          <svg style={{ position: "absolute", inset: 0, opacity: 0.04 }} width="100%" height="100%">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div style={{ position: "relative", textAlign: "left", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>A</div>
              <div>
                <div style={{ fontFamily: "'Nunito Sans', system-ui", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: 2 }}>ACOACH</div>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1.5 }}>AI FITNESS INTELLIGENCE</div>
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 20 }}>Your personal<br /><span style={{ color: T.blue }}>fitness coach.</span></div>
            <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 40 }}>AI-powered insights from your wearable data. Training readiness, recovery plans, and personalised goals — all in one place.</div>
            {["Training Readiness Score", "7-Day Recovery Plans", "AI Goal System", "Fitbit & Strava Sync"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.blue + "30", border: `1px solid ${T.blue}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue }} />
                </div>
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ flex: 1, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 20px" : 48 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff" }}>A</div>
              <div>
                <div style={{ fontFamily: "'Nunito Sans', system-ui", fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: 2 }}>ACOACH</div>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>AI FITNESS INTELLIGENCE</div>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: "'Nunito Sans', system-ui" }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </div>
            <div style={{ fontSize: 14, color: T.muted }}>{mode === "login" ? "Sign in to your ACoach account" : "Join ACoach and train smarter"}</div>
          </div>
          <div style={{ display: "flex", background: T.border + "50", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: mode === m ? T.card : "transparent", color: mode === m ? T.text : T.muted, fontSize: 13, fontWeight: mode === m ? 600 : 400, cursor: "pointer", transition: "all 0.15s", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <Card style={{ padding: isMobile ? 20 : 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mode === "register" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe"
                    style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "system-ui" }} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                  style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "system-ui" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
                  style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "system-ui" }} />
              </div>
              {err && <div style={{ background: T.redLight, border: `1px solid ${T.red}40`, borderRadius: 8, padding: "9px 12px", color: T.red, fontSize: 12 }}>⚠ {err}</div>}
              <button onClick={submit} disabled={busy}
                style={{ width: "100%", background: busy ? T.border : T.blue, border: "none", borderRadius: 8, padding: 13, color: "#fff", fontFamily: "system-ui", fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer" }}>
                {busy ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 12, color: T.muted }}>or</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
              <button onClick={() => window.location.href = `${API_URL}/strava/login/new`}
                style={{ width: "100%", background: T.strava, border: "none", borderRadius: 8, padding: 13, color: "#fff", fontFamily: "system-ui", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <StravaIcon size={18} color="#fff" />
                Continue with Strava
              </button>
            </div>
          </Card>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.subtle }}>Powered by wearable data • ACoach v2</div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ tab, setTab, fetchRecovery, fetchGoal, recovery, goal }) {
  const items = [
    { id: "home",     icon: "⊞", label: "Home"     },
    { id: "glance",   icon: "◎", label: "Glance"   },
    { id: "recovery", icon: "🧘", label: "Recovery" },
    { id: "goal",     icon: "🎯", label: "Goal"     },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 200, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map(n => (
        <button key={n.id} onClick={() => {
          if (n.id === "recovery" && !recovery) fetchRecovery();
          else if (n.id === "goal" && !goal) fetchGoal();
          else setTab(n.id);
        }} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 20 }}>{n.icon}</span>
          <span style={{ fontSize: 10, color: tab === n.id ? T.blue : T.muted, fontWeight: tab === n.id ? 700 : 400, fontFamily: "system-ui" }}>{n.label}</span>
          {tab === n.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.blue }} />}
        </button>
      ))}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px", borderRadius: 8, border: "none", background: active ? T.blue : hover ? T.sidebarHover : "transparent", color: active ? "#fff" : hover ? "#e2e8f0" : "#94a3b8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "system-ui" }}>{label}</span>
    </button>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [authUser, setAuthUser]   = useState(null);
  const [token, setToken]         = useState(null);
  const [data, setData]           = useState(null);
  const [ts, setTs]               = useState(null);
  const [recovery, setRecovery]   = useState(null);
  const [goal, setGoal]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingGoal, setLoadingGoal] = useState(false);
  const [err, setErr]             = useState("");
  const [tab, setTab]             = useState("home");
  const [showFeedback, setShowFeedback] = useState(false);
  const [animScore, setAnimScore] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [fitbitData, setFitbitData] = useState(null);
  const [fitbitSyncing, setFitbitSyncing] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaData, setStravaData] = useState(null);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [datasetUsers, setDatasetUsers] = useState([]);
  const [selectedDatasetUser, setSelectedDatasetUser] = useState(null);

  const hrData     = useRef(seeded(12345, 24, 58, 140));
  const sleepData  = useRef(seeded(12346, 7, 4, 9));
  const stepsData  = useRef(seeded(12347, 7, 3000, 14000));
  const calData    = useRef(seeded(12348, 7, 1600, 3200));
  const hrvData    = useRef(seeded(12349, 14, 1, 4));
  const stressData = useRef(seeded(12350, 24, 10, 80));

  useEffect(() => {
    const savedToken = localStorage.getItem("acoach_token");
    const savedUser  = localStorage.getItem("acoach_user");
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setAuthUser(parsedUser);
      checkIntegrations(parsedUser.id);
    }
  }, []);

  const checkIntegrations = async (uid) => {
    try {
      const [fitRes, strRes] = await Promise.all([
        fetch(`${API_URL}/fitbit/status/${uid}`),
        fetch(`${API_URL}/strava/status/${uid}`)
      ]);
      const fitData = await fitRes.json();
      const strData = await strRes.json();
      setFitbitConnected(fitData.connected);
      setStravaConnected(strData.connected);
      if (fitData.connected) syncFitbit(uid);
      if (strData.connected) syncStrava(uid);
    } catch {}
  };

  useEffect(() => {
    if (authUser) {
      checkIntegrations(authUser.id);
      fetch(`${API_URL}/users`).then(r => r.json()).then(d => {
        setDatasetUsers(d.users || []);
        if (d.users?.length) { setSelectedDatasetUser(d.users[0]); fetchReport(d.users[0]); }
      }).catch(() => {});
    }
  }, [authUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dashUser = params.get("dashboard_user");
    const stravaOk = params.get("strava_connected");
    if (dashUser || stravaOk) {
      window.history.replaceState({}, "", window.location.pathname);
      const u = JSON.parse(localStorage.getItem("acoach_user") || "{}");
      if (u.id) {
        if (dashUser) { setFitbitConnected(true); syncFitbit(u.id); }
        if (stravaOk) { setStravaConnected(true); syncStrava(u.id); }
      }
    }
  }, []);

  useEffect(() => {
    const seed = parseInt(selectedDatasetUser) || 12345;
    hrData.current     = seeded(seed,     24, 58,   140);
    sleepData.current  = seeded(seed + 1,  7,  4,     9);
    stepsData.current  = seeded(seed + 2,  7, 3000, 14000);
    stressData.current = seeded(seed + 3, 24, 10,    80);
    calData.current    = seeded(seed + 4,  7, 1600,  3200);
    hrvData.current    = seeded(seed + 5, 14, 1,      4);
  }, [selectedDatasetUser]);

  useEffect(() => {
    const score = typeof data?.health === "number" ? data.health : data?.health?.score ?? data?.health?.health_score ?? null;
    if (!score) return;
    let raf, t0 = null;
    const go = stamp => { if (!t0) t0 = stamp; const p = Math.min((stamp - t0) / 800, 1); setAnimScore((1 - Math.pow(1 - p, 3)) * score); if (p < 1) raf = requestAnimationFrame(go); };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [data?.health]);

  const fetchReport = async uid => {
    setErr(""); setData(null); setTs(null); setRecovery(null); setGoal(null); setLoading(true);
    try {
      const [coachRes, tsRes] = await Promise.all([fetch(`${API_URL}/coach/${uid}`), fetch(`${API_URL}/timeseries/${uid}`)]);
      if (!coachRes.ok) throw new Error(`Error ${coachRes.status}`);
      setData(await coachRes.json());
      if (tsRes.ok) setTs(await tsRes.json());
      setTab("home");
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const fetchRecovery = async () => {
    setLoadingRec(true);
    try { const r = await fetch(`${API_URL}/recovery/${selectedDatasetUser}`); if (r.ok) setRecovery(await r.json()); else throw new Error(); }
    catch { setRecovery({ plan: ["Full Rest + Sleep","Full Rest + Sleep","Light Activity (20–30 min)","Light Activity (20–30 min)","Light Activity (20–30 min)","Light Activity (20–30 min)","Return to Training"], fatigue: 2 }); }
    finally { setLoadingRec(false); setTab("recovery"); }
  };

  const fetchGoal = async () => {
    setLoadingGoal(true); setShowFeedback(false);
    try { const r = await fetch(`${API_URL}/goal/${selectedDatasetUser}`); if (r.ok) setGoal(await r.json()); else throw new Error(); }
    catch { setGoal({ goal: "Active Recovery", focus: "Reduce load", plan: ["Sleep 8+ hours nightly","Take 2 full rest days","Light walks 20–30 min","Drink 3L water daily","Breathing exercises"], explanation: ["High fatigue","Low step count","HR trend elevated"] }); }
    finally { setLoadingGoal(false); setTab("goal"); }
  };

  const syncFitbit = async (uid) => {
    const id = uid || authUser?.id; if (!id) return;
    setFitbitSyncing(true);
    try { const r = await fetch(`${API_URL}/fitbit/sync/${id}`); if (r.ok) { const d = await r.json(); setFitbitData(d.data); } } catch {}
    finally { setFitbitSyncing(false); }
  };

  const syncStrava = async (uid) => {
    const id = uid || authUser?.id; if (!id) return;
    setStravaSyncing(true);
    try { const r = await fetch(`${API_URL}/strava/sync/${id}`); if (r.ok) { const d = await r.json(); setStravaData(d.data); } } catch {}
    finally { setStravaSyncing(false); }
  };

  const disconnectFitbit = async () => {
    if (!confirm("Disconnect Fitbit? You can reconnect anytime.")) return;
    await fetch(`${API_URL}/fitbit/disconnect/${authUser.id}`, { method: "DELETE" });
    setFitbitConnected(false); setFitbitData(null);
  };

  const disconnectStrava = async () => {
    if (!confirm("Disconnect Strava? You can reconnect anytime.")) return;
    await fetch(`${API_URL}/strava/disconnect/${authUser.id}`, { method: "DELETE" });
    setStravaConnected(false); setStravaData(null);
  };

  const handleLogin  = (user, tok) => { setAuthUser(user); setToken(tok); };
  const handleLogout = () => {
    localStorage.removeItem("acoach_token"); localStorage.removeItem("acoach_user");
    setAuthUser(null); setToken(null); setData(null); setTs(null);
    setRecovery(null); setGoal(null); setFitbitConnected(false); setFitbitData(null);
    setStravaConnected(false); setStravaData(null);
  };

  if (!authUser) return <AuthPage onLogin={handleLogin} />;

  const fat      = fatigueInfo(data?.burnout);
  const progress = data?.progress ?? 0;
  const rc       = riskColor(data?.risk);
  const health   = typeof data?.health === "number" ? data.health : data?.health?.score ?? data?.health?.health_score ?? null;
  const hc       = healthColor(health);
  const hl       = healthLabel(health);
  const dayL     = ["M","T","W","T","F","S","S"];

  const hrChart     = ts?.hr?.length       ? ts.hr       : hrData.current;
  const sleepChart  = ts?.sleep?.length    ? ts.sleep    : sleepData.current;
  const stepsChart  = ts?.steps?.length    ? ts.steps    : stepsData.current;
  const calChart    = ts?.calories?.length ? ts.calories : calData.current;
  const hrvChart    = ts?.hrv?.length      ? ts.hrv      : hrvData.current;
  const stressChart = stressData.current;

  const tsLen       = Math.min(sleepChart.length, 7);
  const chartLabels = dayL.slice(0, tsLen);
  const latestHrv   = hrvChart.length > 0 ? hrvChart[hrvChart.length - 1] : null;
  const latestHrv7d = ts?.hrv_7d?.length ? ts.hrv_7d[ts.hrv_7d.length - 1] : latestHrv;
  const hrvColor    = latestHrv > 2.5 ? T.green : latestHrv > 1.5 ? T.amber : T.red;
  const hrvStatus   = latestHrv > 2.5 ? "Balanced" : latestHrv > 1.5 ? "Low" : latestHrv ? "Poor" : "N/A";
  const tsStatus    = (data?.burnout || "").toUpperCase().includes("HIGH") ? "Overreaching"
                    : (data?.burnout || "").toUpperCase().includes("MODERATE") ? "Peaking"
                    : (data?.risk || "").toUpperCase().includes("LOW") ? "Productive"
                    : "Recovery";

  const navItems = [
    { id: "home",     icon: "⊞",  label: "Home"        },
    { id: "glance",   icon: "◎",  label: "At a Glance" },
    { id: "recovery", icon: "🧘", label: "Recovery"    },
    { id: "goal",     icon: "🎯", label: "Goal"        },
  ];
  const tabTitle = navItems.find(n => n.id === tab)?.label || "Home";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; font-family: 'DM Sans', system-ui, sans-serif; color: ${T.text}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade { animation: fadeUp 0.25s ease both; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: white; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {!isMobile && (
          <div style={{ width: sidebarOpen ? 220 : 64, background: T.sidebar, flexShrink: 0, display: "flex", flexDirection: "column", transition: "width 0.2s ease", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
            <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #ffffff12" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>A</div>
                {sidebarOpen && <div>
                  <div style={{ fontFamily: "'Nunito Sans', system-ui", fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 1.5 }}>ACOACH</div>
                  <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>FITNESS AI</div>
                </div>}
              </div>
            </div>
            {sidebarOpen && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff10" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.blue + "30", border: `1px solid ${T.blue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.blue, flexShrink: 0 }}>
                    {authUser.username?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{authUser.username}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{authUser.email}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {fitbitConnected && <span style={{ fontSize: 9, color: T.cyan }}>⌚ Fitbit</span>}
                      {stravaConnected && <span style={{ fontSize: 9, color: T.strava }}>🏃 Strava</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
              {sidebarOpen && <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.2, textTransform: "uppercase", padding: "4px 8px 8px", fontWeight: 600 }}>Dashboard</div>}
              {navItems.map(n => (
                <NavItem key={n.id} icon={n.icon} label={sidebarOpen ? n.label : ""} active={tab === n.id}
                  onClick={() => { if (n.id === "recovery" && !recovery) fetchRecovery(); else if (n.id === "goal" && !goal) fetchGoal(); else setTab(n.id); }} />
              ))}
              {sidebarOpen && <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.2, textTransform: "uppercase", padding: "16px 8px 8px", fontWeight: 600 }}>Plans</div>}
              <NavItem icon="🧘" label={sidebarOpen ? (loadingRec ? "Loading…" : "Recovery Plan") : ""} active={false} onClick={fetchRecovery} />
              <NavItem icon="🎯" label={sidebarOpen ? (loadingGoal ? "Loading…" : "AI Goal") : ""} active={false} onClick={fetchGoal} />
            </div>
            <div style={{ padding: "12px 8px", borderTop: "1px solid #ffffff10" }}>
              <NavItem icon="↩" label={sidebarOpen ? "Sign Out" : ""} active={false} onClick={handleLogout} />
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isMobile ? "10px 16px" : "12px 24px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, position: "sticky", top: 0, zIndex: 100 }}>
            {!isMobile ? (
              <button onClick={() => setSidebarOpen(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: T.muted }}>☰</button>
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 10, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>A</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: T.text, fontFamily: "'Nunito Sans', system-ui" }}>{tabTitle}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{authUser.username} • {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
            </div>
            {!isMobile && datasetUsers.length > 0 && (
              <select value={selectedDatasetUser || ""} onChange={e => { setSelectedDatasetUser(e.target.value); fetchReport(e.target.value); }}
                style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: T.text, cursor: "pointer", outline: "none" }}>
                {datasetUsers.map(u => <option key={u} value={u}>Dataset: {u}</option>)}
              </select>
            )}
            <button onClick={() => window.location.href = `${API_URL}/fitbit/login/${authUser.id}`}
              style={{ background: fitbitConnected ? T.greenLight : T.blueLight, border: `1px solid ${fitbitConnected ? T.green : T.blue}`, borderRadius: 8, padding: isMobile ? "6px 8px" : "6px 14px", color: fitbitConnected ? T.green : T.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              <span>⌚</span>
              <span>{fitbitConnected ? (isMobile ? "✓" : "Fitbit ✓") : "Fitbit"}</span>
            </button>
            <button onClick={() => window.location.href = `${API_URL}/strava/login/${authUser.id}`}
              style={{ background: stravaConnected ? T.stravaLight : T.strava, border: `1px solid ${T.strava}`, borderRadius: 8, padding: isMobile ? "6px 8px" : "6px 14px", color: stravaConnected ? T.strava : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              <StravaIcon size={13} color={stravaConnected ? T.strava : "#fff"} />
              <span>{stravaConnected ? (isMobile ? "✓" : "Strava ✓") : "Strava"}</span>
            </button>
            {isMobile && <button onClick={handleLogout} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer", fontSize: 14, color: T.muted }}>↩</button>}
            {err && <div style={{ background: T.redLight, color: T.red, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>⚠ {err}</div>}
          </div>

          {isMobile && datasetUsers.length > 0 && (
            <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "8px 16px" }}>
              <select value={selectedDatasetUser || ""} onChange={e => { setSelectedDatasetUser(e.target.value); fetchReport(e.target.value); }}
                style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: T.text, cursor: "pointer", outline: "none" }}>
                {datasetUsers.map(u => <option key={u} value={u}>Dataset: {u}</option>)}
              </select>
            </div>
          )}

          <div style={{ flex: 1, padding: isMobile ? "16px" : "24px", overflowY: "auto", paddingBottom: isMobile ? 80 : 24 }}>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.blue, animation: "spin 0.8s linear infinite" }} />
                <div style={{ fontSize: 13, color: T.muted }}>Loading your data…</div>
              </div>
            )}

            {data && !loading && (
              <>
                {tab === "home" && (
                  <div className="fade">
                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
                      <Card accent={hc}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <MetricLabel>Readiness</MetricLabel>
                            <BigNum color={hc} size={isMobile ? 26 : 32}>{health != null ? Math.round(animScore) : "—"}</BigNum>
                            <SubText>{hl} · {data.risk || "—"}</SubText>
                          </div>
                          <Ring pct={health ?? 0} color={hc} size={isMobile ? 48 : 60} stroke={5}>
                            <span style={{ fontSize: isMobile ? 11 : 14, fontWeight: 700, color: hc }}>{health != null ? Math.round(animScore) : "—"}</span>
                          </Ring>
                        </div>
                      </Card>
                      <Card accent={fat.color}>
                        <MetricLabel>Body Battery</MetricLabel>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Ring pct={progress} color={progress > 60 ? T.green : progress > 30 ? T.amber : T.red} size={isMobile ? 48 : 60} stroke={5}>
                            <span style={{ fontSize: isMobile ? 11 : 14, fontWeight: 700 }}>{progress}</span>
                          </Ring>
                          <div>
                            <BigNum size={isMobile ? 22 : 28}>{progress}</BigNum>
                            <SubText>+{Math.round(progress * 0.6)} charged</SubText>
                          </div>
                        </div>
                      </Card>
                      <Card>
                        <MetricLabel>Sleep Coach</MetricLabel>
                        <BigNum size={isMobile ? 18 : 24}>{data.profile?.avg_sleep ? `${Math.floor(data.profile.avg_sleep / 60)}h ${Math.round(data.profile.avg_sleep % 60)}m` : "8h rec."}</BigNum>
                        <SubText>{(data.profile?.avg_sleep ?? 480) < 420 ? "Need more sleep." : "Sleep on track."}</SubText>
                      </Card>
                      <Card>
                        <MetricLabel>HRV Status</MetricLabel>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: hrvColor }} />
                          <BigNum color={hrvColor} size={isMobile ? 16 : 22}>{hrvStatus}</BigNum>
                        </div>
                        <SubText>{latestHrv7d != null ? latestHrv7d.toFixed(2) + " RMSSD" : "No data"}</SubText>
                      </Card>
                    </div>

                    {/* Devices & Apps */}
                    <SectionLabel>Your Devices & Apps</SectionLabel>

                    {/* Fitbit Card */}
                    <Card accent={fitbitConnected ? T.green : T.border} style={{ marginBottom: isMobile ? 12 : 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 18 }}>⌚</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Fitbit</span>
                            {fitbitConnected && <span style={{ fontSize: 10, background: T.greenLight, color: T.green, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Connected</span>}
                          </div>
                          {fitbitConnected ? (
                            fitbitData ? (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                                {[
                                  { label: "Steps",    val: fitbitData.TotalSteps?.toLocaleString() ?? "—",   icon: "👟" },
                                  { label: "Calories", val: fitbitData.Calories?.toLocaleString() ?? "—",     icon: "🔥" },
                                  { label: "Sleep",    val: fitbitData.TotalMinutesAsleep ? `${Math.floor(fitbitData.TotalMinutesAsleep/60)}h ${fitbitData.TotalMinutesAsleep%60}m` : "—", icon: "😴" },
                                  { label: "Avg HR",   val: fitbitData.AvgHeartRate ? `${Math.round(fitbitData.AvgHeartRate)} bpm` : "—", icon: "❤️" },
                                ].map(m => (
                                  <div key={m.label} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
                                    <div style={{ fontSize: 13, marginBottom: 2 }}>{m.icon}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.val}</div>
                                    <div style={{ fontSize: 10, color: T.muted }}>{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            ) : <SubText>{fitbitSyncing ? "Syncing…" : "Click Sync to load today's data"}</SubText>
                          ) : <SubText>Connect your Fitbit for real-time health data</SubText>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                          {fitbitConnected && <button onClick={() => syncFitbit(authUser.id)} style={{ background: T.greenLight, border: `1px solid ${T.green}`, borderRadius: 8, padding: "7px 10px", color: T.green, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{fitbitSyncing ? "…" : "🔄"}</button>}
                          <button onClick={() => window.location.href = `${API_URL}/fitbit/login/${authUser.id}`}
                            style={{ background: fitbitConnected ? T.bg : T.green, border: `1px solid ${fitbitConnected ? T.border : T.green}`, borderRadius: 8, padding: "7px 10px", color: fitbitConnected ? T.muted : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            {fitbitConnected ? "Reconnect" : "🔗 Connect"}
                          </button>
                          {fitbitConnected && (
                            <button onClick={disconnectFitbit}
                              style={{ background: T.redLight, border: `1px solid ${T.red}`, borderRadius: 8, padding: "7px 10px", color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Disconnect
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Strava Full Dashboard */}
                    <StravaDashboard
                      authUser={authUser}
                      stravaConnected={stravaConnected}
                      stravaData={stravaData}
                      stravaSyncing={stravaSyncing}
                      onSync={() => syncStrava(authUser.id)}
                      onDisconnect={disconnectStrava}
                      isMobile={isMobile}
                    />

                    {/* In Focus */}
                    <SectionLabel>In Focus</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: hc + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏃</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Training Readiness</div>
                            <div style={{ fontSize: 11, color: T.muted }}>Balance your training load</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                          {[
                            { label: "Sleep",      val: (data.profile?.avg_sleep ?? 450) < 420 ? "Fair" : "Good", color: (data.profile?.avg_sleep ?? 450) < 420 ? T.amber : T.green },
                            { label: "Recovery",   val: health >= 60 ? "Good" : health >= 35 ? "Moderate" : "Low", color: hc },
                            { label: "HRV",        val: hrvStatus, color: hrvColor },
                            { label: "Acute Load", val: fat.label, color: fat.color },
                            { label: "Progress",   val: `${progress}%`, color: T.blue },
                            { label: "Risk",       val: data.risk || "—", color: rc },
                          ].map(r => (
                            <div key={r.label}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</div>
                              <div style={{ fontSize: 10, color: T.muted }}>{r.label}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                      <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Training Status</div>
                            <BigNum size={isMobile ? 18 : 20}>{tsStatus}</BigNum>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Pill color={T.green} bg={T.greenLight}>VO₂ Good</Pill>
                            <div style={{ marginTop: 4 }}><Pill color={fat.color} bg={fat.color + "18"}>{fat.label} Load</Pill></div>
                          </div>
                        </div>
                        <StatusBar value={tsStatus} />
                        <div style={{ marginTop: 10, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{data.burnout || "—"}</div>
                      </Card>
                    </div>

                    {/* Insights */}
                    <SectionLabel>Insights</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
                      {[
                        { icon: "😴", color: T.blue, bg: T.blueLight, label: "Sleep Coach", val: data.profile?.avg_sleep ? `${Math.floor(data.profile.avg_sleep / 60)}h recommended` : "9h recommended", sub: (data.profile?.avg_sleep ?? 480) < 420 ? "You could use more sleep." : "Good sleep pattern." },
                        { icon: "⚡", color: T.amber, bg: T.amberLight, label: "Forecast", val: data.forecast || "—", sub: "" },
                        { icon: "💡", color: T.purple, bg: T.purpleLight, label: "Insight", val: data.insight || "—", sub: "" },
                      ].map(item => (
                        <Card key={item.label} style={{ borderLeft: `3px solid ${item.color}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                            <div>
                              <MetricLabel>{item.label}</MetricLabel>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.val}</div>
                              {item.sub && <SubText>{item.sub}</SubText>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* At a Glance preview */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <SectionLabel>At a Glance</SectionLabel>
                      <button onClick={() => setTab("glance")} style={{ fontSize: 13, color: T.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>See All</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
                      {[
                        { label: "Heart Rate",  val: `${data.profile?.avg_hr ?? 72}`,  unit: "bpm",       chart: <SparkLine data={hrChart} color={T.red} h={32} /> },
                        { label: "Sleep",       val: `${data.profile?.avg_sleep ? Math.floor(data.profile.avg_sleep / 60) : 6}h ${data.profile?.avg_sleep ? Math.round(data.profile.avg_sleep % 60) : 24}m`, unit: "Duration", chart: <SparkBar data={sleepChart.slice(0, 7)} color={T.purple} h={32} /> },
                        { label: "HRV",         val: latestHrv7d ? latestHrv7d.toFixed(0) + " ms" : "—", unit: "7d Avg",    chart: <SparkLine data={hrvChart} color={hrvColor} h={32} /> },
                        { label: "Steps",       val: (data.profile?.avg_steps ?? 7500).toLocaleString(),  unit: "daily avg", chart: <SparkBar data={stepsChart.slice(0, 7)} color={T.blue} h={32} /> },
                      ].map(m => (
                        <Card key={m.label}>
                          <MetricLabel>{m.label}</MetricLabel>
                          <BigNum size={isMobile ? 16 : 20}>{m.val}</BigNum>
                          <div style={{ fontSize: 10, color: T.subtle }}>{m.unit}</div>
                          <div style={{ marginTop: 6, minHeight: 32 }}>{m.chart}</div>
                        </Card>
                      ))}
                    </div>

                    {/* Training Plans */}
                    <SectionLabel>Training Plans</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 10 : 16 }}>
                      <button onClick={fetchRecovery} style={{ background: T.card, border: `1px solid ${T.blue}44`, borderRadius: 12, padding: isMobile ? 14 : 20, color: T.blue, textAlign: "left", cursor: "pointer" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, marginBottom: 8 }}>🧘</div>
                        <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Nunito Sans', system-ui" }}>{loadingRec ? "Loading…" : "Recovery Plan"}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>7-day programme</div>
                      </button>
                      <button onClick={fetchGoal} style={{ background: T.card, border: `1px solid ${T.green}44`, borderRadius: 12, padding: isMobile ? 14 : 20, color: T.green, textAlign: "left", cursor: "pointer" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, marginBottom: 8 }}>🎯</div>
                        <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Nunito Sans', system-ui" }}>{loadingGoal ? "Loading…" : "AI Goal"}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>Personalised target</div>
                      </button>
                    </div>
                  </div>
                )}

                {tab === "glance" && (
                  <div className="fade">
                    {ts && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.greenLight, color: T.green, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>● Live data — {ts.dates?.length} days</div>}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: isMobile ? 12 : 16 }}>
                      <Card>
                        <MetricLabel>❤️ Heart Rate</MetricLabel>
                        <BigNum size={isMobile ? 24 : 28}>{data.profile?.avg_hr ?? 72} <span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>bpm</span></BigNum>
                        <SubText>{Math.round((data.profile?.avg_hr ?? 72) * 0.65)} bpm Resting</SubText>
                        <div style={{ marginTop: 10, minHeight: 48 }}><SparkLine data={hrChart} color={T.red} h={48} /></div>
                      </Card>
                      <Card>
                        <MetricLabel>⚡ Body Battery</MetricLabel>
                        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                          <Ring pct={progress} color={progress > 60 ? T.green : progress > 30 ? T.amber : T.red} size={isMobile ? 70 : 80} stroke={8}>
                            <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700 }}>{progress}</span>
                          </Ring>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: T.green }}>+{Math.round(progress * 0.6)} Charged</span>
                          <span style={{ color: T.red }}>-{Math.round(progress * 0.4)} Drained</span>
                        </div>
                      </Card>
                      <Card>
                        <MetricLabel>😴 Sleep</MetricLabel>
                        <BigNum size={isMobile ? 20 : 24}>{data.profile?.avg_sleep ? `${Math.floor(data.profile.avg_sleep / 60)}h ${Math.round(data.profile.avg_sleep % 60)}m` : "6h 24m"}</BigNum>
                        <SubText>Duration avg</SubText>
                        <div style={{ marginTop: 10, minHeight: 62 }}><SparkBar data={sleepChart.slice(0, 7)} color={T.purple} h={48} labels={chartLabels} /></div>
                      </Card>
                      <Card>
                        <MetricLabel>💚 HRV Status</MetricLabel>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: hrvColor }} />
                          <BigNum color={hrvColor} size={16}>{hrvStatus}</BigNum>
                        </div>
                        <BigNum size={isMobile ? 22 : 26}>{latestHrv7d != null ? latestHrv7d.toFixed(2) : "—"} <span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>RMSSD</span></BigNum>
                        <SubText>7d Avg {ts ? "(real data)" : "(estimated)"}</SubText>
                        <div style={{ marginTop: 10, minHeight: 40 }}><SparkLine data={hrvChart} color={hrvColor} h={40} /></div>
                      </Card>
                      <Card>
                        <MetricLabel>🔄 Training Load</MetricLabel>
                        <BigNum color={fat.color} size={isMobile ? 18 : 22}>{fat.label === "High" ? "Very high" : fat.label}</BigNum>
                        <SubText>Acute/Chronic Load</SubText>
                        <div style={{ marginTop: 4, fontSize: 14, color: T.text }}>{(progress / 50).toFixed(1)} <span style={{ fontSize: 12, color: T.muted }}>Load Ratio</span></div>
                      </Card>
                      <Card>
                        <MetricLabel>📊 Training Status</MetricLabel>
                        <BigNum size={isMobile ? 18 : 20}>{tsStatus}</BigNum>
                        <SubText>Since last 4w</SubText>
                        <div style={{ marginTop: 12 }}><StatusBar value={tsStatus} /></div>
                      </Card>
                      <Card>
                        <MetricLabel>🧠 Stress</MetricLabel>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <Ring pct={fat.pct} color={fat.color} size={60} stroke={7}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: fat.color }}>{fat.pct}</span>
                          </Ring>
                          <div style={{ flex: 1, minHeight: 48 }}><SparkBar data={stressChart.slice(0, 12)} color={fat.color} h={48} /></div>
                        </div>
                      </Card>
                      <Card>
                        <MetricLabel>👟 Steps</MetricLabel>
                        <BigNum size={isMobile ? 22 : 26}>{(data.profile?.avg_steps ?? 7500).toLocaleString()}</BigNum>
                        <SubText>Daily avg</SubText>
                        <div style={{ marginTop: 10, minHeight: 62 }}><SparkBar data={stepsChart.slice(0, 7)} color={T.blue} h={48} labels={chartLabels} /></div>
                      </Card>
                      <Card style={{ gridColumn: isMobile ? "1" : "span 2" }}>
                        <MetricLabel>🔥 Calories</MetricLabel>
                        <BigNum size={isMobile ? 22 : 26}>{(data.profile?.avg_cal ?? 2200).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>kcal avg</span></BigNum>
                        <div style={{ minHeight: 70, marginTop: 10 }}><SparkBar data={calChart.slice(0, 7)} color={T.orange} h={56} labels={chartLabels} /></div>
                      </Card>
                      {data.trends && (
                        <Card style={{ gridColumn: isMobile ? "1" : "span 2" }}>
                          <MetricLabel>📈 Trends — Last 4W</MetricLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {[
                              { key: "step_trend",  icon: "👟", label: "Steps",      max: 600 },
                              { key: "sleep_trend", icon: "😴", label: "Sleep",      max: 60  },
                              { key: "hr_trend",    icon: "❤️", label: "Heart Rate", max: 20  },
                            ].filter(r => data.trends[r.key] != null).map(row => {
                              const v = data.trends[row.key], pos = v > 0;
                              const tc = row.key === "hr_trend" ? (pos ? T.red : T.green) : (pos ? T.green : T.red);
                              return (
                                <div key={row.key}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <span style={{ fontSize: 14 }}>{row.icon}</span>
                                      <span style={{ fontSize: 13, color: T.muted }}>{row.label}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                      <span style={{ color: tc, fontSize: 12 }}>{pos ? "▲" : "▼"}</span>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: tc }}>{Math.abs(v).toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div style={{ background: T.border, borderRadius: 4, height: 6 }}>
                                    <div style={{ width: `${Math.min(Math.abs(v) / row.max * 100, 100)}%`, height: "100%", background: tc, borderRadius: 4, transition: "width 1s ease" }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {tab === "recovery" && (
                  <div className="fade">
                    {!recovery ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 16 }}>
                        <div style={{ fontSize: 48 }}>🧘</div>
                        <div style={{ fontSize: 16, color: T.muted }}>No recovery plan loaded yet</div>
                        <button onClick={fetchRecovery} style={{ background: T.blue, borderRadius: 8, padding: "12px 28px", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Generate Plan</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
                          <Card accent={fat.color}><MetricLabel>Fatigue</MetricLabel><BigNum color={fat.color} size={isMobile ? 20 : 28}>{fat.label}</BigNum></Card>
                          <Card accent={T.blue}><MetricLabel>Progress</MetricLabel><BigNum color={T.blue} size={isMobile ? 20 : 28}>{progress}%</BigNum></Card>
                          <Card accent={hc}><MetricLabel>Recovery Index</MetricLabel><BigNum color={hc} size={isMobile ? 20 : 28}>{recovery.recovery_index ?? "—"}</BigNum></Card>
                        </div>
                        <SectionLabel>7-Day Plan</SectionLabel>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(160px, 1fr))", gap: isMobile ? 10 : 12, marginBottom: isMobile ? 16 : 24 }}>
                          {(recovery.plan || []).map((item, i) => {
                            const isRest = item.toLowerCase().includes("rest"), isLight = item.toLowerCase().includes("light");
                            const dc = isRest ? T.blue : isLight ? T.amber : T.green;
                            const di = isRest ? "🛌" : isLight ? "🚶" : "🏃";
                            return (
                              <Card key={i} accent={dc}>
                                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Day {i + 1}</div>
                                <div style={{ fontSize: 14, marginBottom: 4 }}>{di}</div>
                                <div style={{ fontSize: isMobile ? 11 : 13, color: T.text, lineHeight: 1.4 }}>{item}</div>
                              </Card>
                            );
                          })}
                        </div>
                        <Card accent={T.green}>
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💬</div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.green, marginBottom: 4 }}>Coach Note</div>
                              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Prioritise sleep quality and avoid high-intensity sessions until day 7. Stay hydrated and listen to your body.</div>
                            </div>
                          </div>
                        </Card>
                      </>
                    )}
                  </div>
                )}

                {tab === "goal" && (
                  <div className="fade">
                    {!goal ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 16 }}>
                        <div style={{ fontSize: 48 }}>🎯</div>
                        <div style={{ fontSize: 16, color: T.muted }}>No goal generated yet</div>
                        <button onClick={fetchGoal} style={{ background: T.green, borderRadius: 8, padding: "12px 28px", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Generate Goal</button>
                      </div>
                    ) : (
                      <>
                        <Card accent={T.green} style={{ marginBottom: isMobile ? 14 : 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                            <div>
                              <MetricLabel>Current Goal</MetricLabel>
                              <BigNum color={T.green} size={isMobile ? 24 : 32}>{goal.goal || "Active Recovery"}</BigNum>
                              <div style={{ fontSize: 13, color: T.blue, marginTop: 6 }}>Focus: {goal.focus || "Reduce load"}</div>
                            </div>
                            <div style={{ fontSize: isMobile ? 32 : 44 }}>🏆</div>
                          </div>
                        </Card>
                        <Card style={{ marginBottom: isMobile ? 12 : 16 }}>
                          <MetricLabel>Action Plan</MetricLabel>
                          {(goal.plan || []).map((step, i) => {
                            const icons = ["💤","🗓️","🚶","💧","🧘","🏋️","📊","🎯"];
                            return (
                              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < goal.plan.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start" }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{icons[i % icons.length]}</div>
                                <div style={{ fontSize: 13, color: T.muted, paddingTop: 4, lineHeight: 1.5 }}>{step}</div>
                              </div>
                            );
                          })}
                        </Card>
                        {goal.explanation?.length > 0 && (
                          <Card accent={T.purple} style={{ marginBottom: isMobile ? 12 : 16 }}>
                            <MetricLabel>Why This Goal</MetricLabel>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                              {goal.explanation.map((r, i) => <Pill key={i} color={T.purple} bg={T.purpleLight}>{r}</Pill>)}
                            </div>
                          </Card>
                        )}
                        {!showFeedback
                          ? <button onClick={() => setShowFeedback(true)} style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 13, color: T.muted, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>📝 Give Feedback on this Goal</button>
                          : <FeedbackWidget userId={selectedDatasetUser} goalName={goal.goal} onDone={() => setShowFeedback(false)} />}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isMobile && (
        <MobileBottomNav
          tab={tab} setTab={setTab}
          fetchRecovery={fetchRecovery} fetchGoal={fetchGoal}
          recovery={recovery} goal={goal}
        />
      )}
    </>
  );
}