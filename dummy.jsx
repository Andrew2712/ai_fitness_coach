import { useState, useEffect, useRef } from "react";

const API_URL = "https://potential-space-enigma-6996prj45g97cj7w-8000.app.github.dev";

// ─── Colour helpers ───────────────────────────────────────────────────────────
const C = {
  bg:      "#0f1117",
  card:    "#1a1e2e",
  border:  "#252d40",
  sub:     "#4a5568",
  muted:   "#8892a4",
  text:    "#e2e8f0",
  blue:    "#3b82f6",
  green:   "#22c55e",
  red:     "#ef4444",
  amber:   "#f59e0b",
  purple:  "#a855f7",
  orange:  "#f97316",
  cyan:    "#06b6d4",
};

function riskColor(v) {
  if (!v) return C.muted;
  const s = v.toString().toUpperCase();
  if (s.includes("HIGH") || s.includes("CRITICAL")) return C.red;
  if (s.includes("MODERATE") || s.includes("MEDIUM")) return C.amber;
  return C.green;
}
function fatigueInfo(v) {
  if (!v) return { label: "Unknown", color: C.muted, pct: 0 };
  const s = v.toString().toUpperCase();
  if (s.includes("HIGH"))   return { label: "High",   color: C.red,   pct: 85 };
  if (s.includes("MEDIUM") || s.includes("MODERATE")) return { label: "Medium", color: C.amber, pct: 52 };
  return { label: "Low", color: C.green, pct: 18 };
}
function healthColor(n) {
  if (n == null) return C.muted;
  if (n >= 70) return C.green;
  if (n >= 40) return C.amber;
  return C.red;
}
function healthLabel(n) {
  if (n == null) return "N/A";
  if (n >= 70) return "Good";
  if (n >= 40) return "Fair";
  return "Poor";
}

// Seed-stable fallback chart data (used only when timeseries fetch fails)
function seeded(seed, n, lo, hi) {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return lo + ((s >>> 0) / 0xffffffff) * (hi - lo);
  });
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────
function SparkLine({ data, color = C.blue, h = 44, filled = true, strokeW = 1.5 }) {
  if (!data || data.length === 0) return null;
  const W = 300;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${h - 4 - ((v - mn) / rng) * (h - 8)}`);
  const poly = pts.join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {filled && <polygon points={`0,${h} ${poly} ${W},${h}`} fill={color} opacity="0.12" />}
      <polyline points={poly} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function SparkBar({ data, color = C.blue, h = 48, labels, activeIdx }) {
  if (!data || data.length === 0) return null;
  const W = 280, mx = Math.max(...data) || 1;
  const bw = Math.floor(W / data.length) - 3;
  return (
    <svg viewBox={`0 0 ${W} ${h + (labels ? 14 : 0)}`} width="100%" height={h + (labels ? 14 : 0)} preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = Math.max(3, (v / mx) * (h - 6));
        const x  = i * (W / data.length) + 1;
        const isActive = activeIdx === i;
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx="2"
              fill={isActive ? C.cyan : color} opacity={isActive ? 1 : 0.75} />
            {labels && (
              <text x={x + bw / 2} y={h + 11} textAnchor="middle" fontSize="9"
                fill={isActive ? C.text : C.sub} fontFamily="system-ui">{labels[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Ring gauge ───────────────────────────────────────────────────────────────
function Ring({ pct = 0, color = C.blue, size = 80, stroke = 8, track = C.border, glow = true, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let raf, t0 = null;
    const go = ts => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 1000, 1);
      setAnim((1 - Math.pow(1 - p, 3)) * pct);
      if (p < 1) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(anim / 100) * circ} ${circ}`} strokeLinecap="round"
          style={glow ? { filter: `drop-shadow(0 0 5px ${color}bb)` } : {}} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Multi-arc ring (like Garmin's coloured readiness ring) ───────────────────
function MultiRing({ segments, size = 96, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const len = (seg.pct / 100) * circ;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${seg.color}99)` }} />
        );
        offset += len + 2;
        return el;
      })}
    </svg>
  );
}

// ─── Training Status segmented bar (like Garmin) ──────────────────────────────
function StatusBar({ value }) {
  const segs = [
    { label: "Detraining",   color: "#64748b", w: 1   },
    { label: "Recovery",     color: C.blue,    w: 1.5 },
    { label: "Productive",   color: C.green,   w: 2   },
    { label: "Peaking",      color: C.amber,   w: 1.5 },
    { label: "Overreaching", color: C.red,     w: 1   },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 2, borderRadius: 6, overflow: "hidden", height: 10, marginBottom: 6 }}>
        {segs.map(s => (
          <div key={s.label} style={{ flex: s.w, background: s.label === value ? s.color : s.color + "40", transition: "all 0.4s" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {segs.map(s => (
          <div key={s.label} style={{ flex: s.w, fontSize: 8, color: s.label === value ? s.color : C.sub,
            textAlign: "center", fontWeight: s.label === value ? 700 : 400, fontFamily: "system-ui",
            transition: "all 0.4s" }}>{s.label}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children, span2, accent, style: extra }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14,
      border: `1px solid ${accent ? accent + "44" : C.border}`,
      borderTop: accent ? `2px solid ${accent}` : `1px solid ${C.border}`,
      padding: 16, gridColumn: span2 ? "span 2" : undefined,
      ...extra,
    }}>{children}</div>
  );
}
function CardLabel({ children, color }) {
  return <div style={{ fontSize: 10, color: color || C.sub, letterSpacing: 1.2, marginBottom: 8, fontFamily: "system-ui", fontWeight: 600 }}>{children}</div>;
}
function BigVal({ children, color, size = 26 }) {
  return <div style={{ fontSize: size, fontWeight: 800, color: color || C.text, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5, lineHeight: 1.1 }}>{children}</div>;
}
function SubVal({ children }) {
  return <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui", marginTop: 2 }}>{children}</div>;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
function FeedbackWidget({ userId, goalName, onDone }) {
  const [sel, setSel]         = useState(null);
  const [comment, setComment] = useState("");
  const [sent, setSent]       = useState(false);
  const [busy, setBusy]       = useState(false);

  const opts = [{ r: 1, e: "✅", l: "Yes" }, { r: 2, e: "🔄", l: "Partially" }, { r: 3, e: "❌", l: "No" }];

  const submit = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: String(userId), rating: sel, goal: goalName || "Unknown", comment }),
      });
    } catch {}
    setSent(true);
    setBusy(false);
    setTimeout(() => onDone?.(), 1400);
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: 24, color: C.green, fontSize: 15,
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1.5 }}>✓ FEEDBACK SAVED</div>
  );
  return (
    <Card>
      <CardLabel>DID YOU FOLLOW THE PLAN?</CardLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {opts.map(o => (
          <button key={o.r} onClick={() => setSel(o.r)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
            background: sel === o.r ? C.blue + "22" : C.bg,
            border: `1px solid ${sel === o.r ? C.blue : C.border}`,
            color: sel === o.r ? C.blue : C.muted,
            fontSize: 11, fontFamily: "system-ui", transition: "all 0.15s",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{o.e}</div>{o.l}
          </button>
        ))}
      </div>
      <input value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Optional comment…"
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "9px 12px", color: C.text, fontSize: 12, marginBottom: 10,
          boxSizing: "border-box", fontFamily: "system-ui", outline: "none" }} />
      <button onClick={submit} disabled={!sel || busy} style={{
        width: "100%", background: sel ? C.blue : C.border, border: "none", borderRadius: 10,
        padding: 11, color: sel ? "#fff" : C.sub, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13, fontWeight: 700, letterSpacing: 1.2, cursor: sel ? "pointer" : "not-allowed",
      }}>{busy ? "SAVING…" : "SUBMIT FEEDBACK"}</button>
    </Card>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [users, setUsers]   = useState([]);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    fetch(`${API_URL}/users`).then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {});
  }, []);

  const go = () => {
    if (!userId.trim()) { setErr("Please select a User ID"); return; }
    setBusy(true); setErr("");
    setTimeout(() => { onLogin({ userId: userId.trim() }); setBusy(false); }, 380);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20,
            background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 auto 14px",
            boxShadow: `0 8px 32px ${C.blue}44` }}>A</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28,
            fontWeight: 800, color: C.text, letterSpacing: 3 }}>ACOACH</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 5, letterSpacing: 1.5 }}>AI-POWERED FITNESS COACH</div>
        </div>

        <Card>
          <CardLabel>SELECT YOUR PROFILE</CardLabel>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 7, letterSpacing: 0.5 }}>USER ID</div>
            {users.length > 0 ? (
              <select value={userId} onChange={e => setUserId(e.target.value)} style={{
                width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "12px 14px", color: userId ? C.text : C.sub, fontSize: 14,
                boxSizing: "border-box", outline: "none", cursor: "pointer",
              }}>
                <option value="">Select User ID…</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            ) : (
              <input value={userId} onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && go()}
                placeholder="Enter User ID"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "12px 14px", color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            )}
          </div>
          {err && <div style={{ background: C.red + "20", border: `1px solid ${C.red}40`, borderRadius: 8,
            padding: "9px 12px", color: "#f87171", fontSize: 12, marginBottom: 12 }}>⚠ {err}</div>}
          <button onClick={go} disabled={busy} style={{
            width: "100%", background: busy ? C.border : `linear-gradient(135deg, ${C.blue}, #1d4ed8)`,
            border: "none", borderRadius: 12, padding: 14, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700,
            letterSpacing: 2, cursor: "pointer", boxShadow: busy ? "none" : `0 4px 24px ${C.blue}44`,
          }}>{busy ? "LOADING…" : "START SESSION →"}</button>
        </Card>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#2d3748" }}>
          Powered by your wearable data
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                 = useState(null);
  const [data, setData]                 = useState(null);
  const [ts, setTs]                     = useState(null);   // ← real timeseries data
  const [recovery, setRecovery]         = useState(null);
  const [goal, setGoal]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [loadingRec, setLoadingRec]     = useState(false);
  const [loadingGoal, setLoadingGoal]   = useState(false);
  const [err, setErr]                   = useState("");
  const [tab, setTab]                   = useState("home");
  const [showFeedback, setShowFeedback] = useState(false);
  const [animScore, setAnimScore]       = useState(0);

  // Fallback seeded chart data (only used when /timeseries fails)
  const hrData     = useRef(null);
  const sleepData  = useRef(null);
  const stepsData  = useRef(null);
  const stressData = useRef(null);
  const calData    = useRef(null);
  const hrvData    = useRef(null);

  useEffect(() => {
    const seed = parseInt(user?.userId) || 12345;
    hrData.current     = seeded(seed,     24, 58,   140);
    sleepData.current  = seeded(seed + 1,  7,  4,     9);
    stepsData.current  = seeded(seed + 2,  7, 3000, 14000);
    stressData.current = seeded(seed + 3, 24, 10,    80);
    calData.current    = seeded(seed + 4,  7, 1600,  3200);
    hrvData.current    = seeded(seed + 5, 14, 1,      4);
  }, [user]);

  // Animate health score
  useEffect(() => {
    const score = typeof data?.health === "number" ? data.health
      : data?.health?.score ?? data?.health?.health_score ?? null;
    if (!score) return;
    let raf, t0 = null;
    const go = stamp => {
      if (!t0) t0 = stamp;
      const p = Math.min((stamp - t0) / 1000, 1);
      setAnimScore((1 - Math.pow(1 - p, 3)) * score);
      if (p < 1) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [data?.health]);

  const fetchReport = async uid => {
    setErr(""); setData(null); setTs(null); setRecovery(null); setGoal(null); setLoading(true);
    try {
      // Fetch coach data + timeseries in parallel
      const [coachRes, tsRes] = await Promise.all([
        fetch(`${API_URL}/coach/${uid}`),
        fetch(`${API_URL}/timeseries/${uid}`),
      ]);
      if (!coachRes.ok) throw new Error(`Error ${coachRes.status}`);
      setData(await coachRes.json());
      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTs(tsData);
        console.log("✅ Timeseries loaded:", Object.keys(tsData).map(k => `${k}(${tsData[k]?.length ?? 0})`).join(", "));
      } else {
        console.warn("⚠️ Timeseries unavailable, using fallback chart data");
      }
      setTab("home");
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const fetchRecovery = async () => {
    setLoadingRec(true);
    try {
      const r = await fetch(`${API_URL}/recovery/${user.userId}`);
      if (r.ok) setRecovery(await r.json());
      else throw new Error();
    } catch {
      setRecovery({ plan: ["Full Rest + Sleep","Full Rest + Sleep","Light Activity (20–30 min)","Light Activity (20–30 min)","Light Activity (20–30 min)","Light Activity (20–30 min)","Return to Training"], fatigue: 2 });
    } finally { setLoadingRec(false); setTab("recovery"); }
  };

  const fetchGoal = async () => {
    setLoadingGoal(true); setShowFeedback(false);
    try {
      const r = await fetch(`${API_URL}/goal/${user.userId}`);
      if (r.ok) setGoal(await r.json());
      else throw new Error();
    } catch {
      setGoal({ goal: "Active Recovery", focus: "Reduce load", plan: ["Sleep 8+ hours nightly","Take 2 full rest days","Light walks 20–30 min","Drink 3L water daily","Breathing exercises"], explanation: ["High fatigue","Low step count","HR trend elevated"] });
    } finally { setLoadingGoal(false); setTab("goal"); }
  };

  const handleLogin  = u => { setUser(u); fetchReport(u.userId); };
  const handleLogout = () => { setUser(null); setData(null); setTs(null); setRecovery(null); setGoal(null); };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const fat      = fatigueInfo(data?.burnout);
  const progress = data?.progress ?? 0;
  const rc       = riskColor(data?.risk);
  const health   = typeof data?.health === "number" ? data.health : data?.health?.score ?? data?.health?.health_score ?? null;
  const hc       = healthColor(health);
  const hl       = healthLabel(health);
  const dayL     = ["M","T","W","T","F","S","S"];

  // ── Real chart arrays — use timeseries if available, else fallback ──────────
  const hrChart    = ts?.hr?.length       ? ts.hr       : hrData.current    || [70];
  const sleepChart = ts?.sleep?.length    ? ts.sleep    : sleepData.current || [360];
  const stepsChart = ts?.steps?.length    ? ts.steps    : stepsData.current || [6000];
  const calChart   = ts?.calories?.length ? ts.calories : calData.current   || [2000];
  const hrvChart   = ts?.hrv?.length      ? ts.hrv      : hrvData.current   || [2];
  const stressChart= stressData.current   || [30];

  // Labels trimmed to actual data length (timeseries may be 4 days, not always 7)
  const tsLen       = ts ? Math.min(sleepChart.length, 7) : 7;
  const chartLabels = dayL.slice(0, tsLen);

  // ── Real HRV from last timeseries data point ────────────────────────────────
  const latestHrv   = hrvChart.length > 0 ? hrvChart[hrvChart.length - 1] : null;
  const latestHrv7d = ts?.hrv_7d?.length  ? ts.hrv_7d[ts.hrv_7d.length - 1] : latestHrv;
  const hrvColor    = latestHrv > 2.5 ? C.green : latestHrv > 1.5 ? C.amber : C.red;
  const hrvStatus   = latestHrv > 2.5 ? "Balanced" : latestHrv > 1.5 ? "Low" : latestHrv ? "Poor" : "N/A";

  // Training status string
  const tsStatus =
    (data?.burnout || "").toUpperCase().includes("HIGH")     ? "Overreaching" :
    (data?.burnout || "").toUpperCase().includes("MODERATE") ? "Peaking"      :
    (data?.risk    || "").toUpperCase().includes("LOW")      ? "Productive"   : "Recovery";

  const tabs = [
    { id: "home",     icon: "⊞",  label: "Home"        },
    { id: "glance",   icon: "◎",  label: "At a Glance" },
    { id: "recovery", icon: "🧘", label: "Recovery"    },
    { id: "goal",     icon: "🎯", label: "Goal"        },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${C.bg}; font-family: 'DM Sans', system-ui, sans-serif; color: ${C.text}; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade { animation: fadeUp 0.32s ease both; }
        .pressable { cursor: pointer; transition: transform 0.15s, filter 0.15s; border: none; background: none; }
        .pressable:hover  { filter: brightness(1.1); }
        .pressable:active { transform: scale(0.97); }
        select option { background: ${C.card}; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 68 }}>

        {/* ─── Top bar ─── */}
        <div style={{ position: "sticky", top: 0, zIndex: 200,
          background: C.card, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", padding: "10px 16px", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {user.userId.toString().slice(-2)}
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: 1.5 }}>
              {tabs.find(t => t.id === tab)?.label || "Home"}
            </div>
          </div>
          {/* Live data indicator */}
          {ts && <div style={{ fontSize: 9, color: C.green, letterSpacing: 0.5 }}>● LIVE</div>}
          <button className="pressable" onClick={handleLogout}
            style={{ background: C.border, borderRadius: 8, padding: "5px 11px",
              color: C.muted, fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
            OUT
          </button>
        </div>

        {err && (
          <div style={{ background: C.red + "18", borderBottom: `1px solid ${C.red}38`,
            padding: "9px 16px", color: "#f87171", fontSize: 12 }}>⚠ {err}</div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: "62vh", gap: 14 }}>
            <div style={{ fontSize: 44, opacity: 0.15 }}>🏃</div>
            <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2.5 }}>LOADING DATA…</div>
          </div>
        )}

        {data && !loading && (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 12px" }}>

            {/* ══════════════ HOME ══════════════ */}
            {tab === "home" && (
              <div className="fade">
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>IN FOCUS</div>

                {/* Training Readiness */}
                <Card accent={hc} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 13 }}>🏃</span>
                    <CardLabel>TRAINING READINESS</CardLabel>
                  </div>
                  <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <MultiRing size={100} stroke={11} segments={[
                        { pct: Math.min((health ?? 0) * 0.6, 50), color: hc },
                        { pct: Math.min(fat.pct * 0.25, 22),      color: fat.color },
                        { pct: Math.min(progress * 0.18, 18),     color: C.blue },
                      ]} />
                      <div style={{ position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 28, fontWeight: 800, color: hc, lineHeight: 1 }}>
                          {health != null ? Math.round(animScore) : "—"}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <BigVal color={hc} size={22}>{hl}</BigVal>
                      <SubVal>Let your body recover</SubVal>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginTop: 12 }}>
                        {[
                          { label: "Sleep",      val: (data.profile?.avg_sleep ?? 450) < 420 ? "Fair" : "Good", color: (data.profile?.avg_sleep ?? 450) < 420 ? C.amber : C.green },
                          { label: "Recovery",   val: health >= 60 ? "Good" : health >= 35 ? "Moderate" : "Low", color: hc },
                          { label: "HRV",        val: hrvStatus,   color: hrvColor },
                          { label: "Acute Load", val: fat.label,   color: fat.color },
                          { label: "Progress",   val: `${progress}%`, color: C.blue },
                          { label: "Risk",       val: data.risk || "—", color: rc },
                        ].map(r => (
                          <div key={r.label}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</div>
                            <div style={{ fontSize: 10, color: C.sub }}>{r.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Training Status */}
                <Card style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <CardLabel>TRAINING STATUS</CardLabel>
                      <BigVal size={22}>{tsStatus}</BigVal>
                      <SubVal>{data.burnout || "—"}</SubVal>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.green }}>Good</div>
                      <div style={{ fontSize: 10, color: C.sub }}>VO₂ Max</div>
                      <div style={{ fontSize: 11, color: fat.color, marginTop: 4 }}>{fat.label}</div>
                      <div style={{ fontSize: 10, color: C.sub }}>Load</div>
                    </div>
                  </div>
                  <StatusBar value={tsStatus} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10, color: C.sub }}>
                    <span>Last 4w</span><span>Since this week</span>
                  </div>
                </Card>

                {/* Sleep Coach */}
                <Card style={{ marginBottom: 10 }}>
                  <CardLabel>SLEEP COACH</CardLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%",
                      background: C.blue + "22", border: `1px solid ${C.blue}44`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>😴</div>
                    <div>
                      <BigVal size={18}>
                        {data.profile?.avg_sleep
                          ? `${Math.floor(data.profile.avg_sleep / 60)}h ${Math.round(data.profile.avg_sleep % 60)}m avg`
                          : "8h recommended"}
                      </BigVal>
                      <SubVal>{(data.profile?.avg_sleep ?? 480) < 420 ? "You could use more sleep today." : "Sleep is on track."}</SubVal>
                    </div>
                  </div>
                </Card>

                {/* At a Glance preview */}
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, margin: "14px 0 10px", fontWeight: 600,
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>AT A GLANCE</span>
                  <span style={{ color: C.blue, cursor: "pointer" }} onClick={() => setTab("glance")}>See All</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <Card>
                    <CardLabel>❤️ HEART RATE</CardLabel>
                    <BigVal size={24}>{data.profile?.avg_hr ?? 72} <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>bpm</span></BigVal>
                    <div style={{ marginTop: 8 }}>
                      <SparkLine data={hrChart} color={C.red} h={36} />
                    </div>
                  </Card>
                  <Card>
                    <CardLabel>⚡ BODY BATTERY</CardLabel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0 2px" }}>
                      <Ring pct={progress} color={progress > 60 ? C.green : progress > 30 ? C.amber : C.red} size={68} stroke={7}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800 }}>{progress}</div>
                      </Ring>
                    </div>
                    <div style={{ fontSize: 11, color: C.green }}>+{Math.round(progress * 0.6)} Charged</div>
                    <div style={{ fontSize: 11, color: C.red }}>-{Math.round(progress * 0.4)} Drained</div>
                  </Card>
                </div>

                {/* Forecast + Insight */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <Card>
                    <CardLabel>🔮 FORECAST</CardLabel>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{data.forecast || "—"}</div>
                  </Card>
                  <Card>
                    <CardLabel>💡 INSIGHT</CardLabel>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{data.insight || "—"}</div>
                  </Card>
                </div>

                {/* Action tiles */}
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>TRAINING PLANS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="pressable" onClick={fetchRecovery}
                    style={{ background: C.card, border: `1px solid ${C.blue}44`, borderRadius: 14,
                      padding: 16, color: C.blue, textAlign: "left" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🧘</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                      fontWeight: 700, letterSpacing: 1 }}>{loadingRec ? "LOADING…" : "RECOVERY PLAN"}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>7-day programme</div>
                  </button>
                  <button className="pressable" onClick={fetchGoal}
                    style={{ background: C.card, border: `1px solid ${C.green}44`, borderRadius: 14,
                      padding: 16, color: C.green, textAlign: "left" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🎯</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                      fontWeight: 700, letterSpacing: 1 }}>{loadingGoal ? "LOADING…" : "AI GOAL"}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>Personalised target</div>
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════ AT A GLANCE ══════════════ */}
            {tab === "glance" && (
              <div className="fade">
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, marginBottom: 12, fontWeight: 600 }}>
                  AT A GLANCE {ts && <span style={{ color: C.green, fontSize: 9 }}>● REAL DATA ({ts.dates?.length} days)</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                  {/* Heart Rate — real sparkline */}
                  <Card>
                    <CardLabel>❤️ HEART RATE</CardLabel>
                    <BigVal size={26}>{data.profile?.avg_hr ?? 72} <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>bpm</span></BigVal>
                    <SubVal>{Math.round((data.profile?.avg_hr ?? 72) * 0.65)} bpm Resting</SubVal>
                    <div style={{ marginTop: 8 }}>
                      <SparkLine data={hrChart} color={C.red} h={44} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.sub, marginTop: 2 }}>
                      <span>{ts?.dates?.[0] ?? "—"}</span>
                      <span>{ts?.dates?.[ts.dates.length - 1] ?? "—"}</span>
                    </div>
                  </Card>

                  {/* Body Battery */}
                  <Card>
                    <CardLabel>⚡ BODY BATTERY</CardLabel>
                    <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 8px" }}>
                      <Ring pct={progress}
                        color={progress > 60 ? C.green : progress > 30 ? C.amber : C.red}
                        size={80} stroke={9}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800 }}>{progress}</div>
                      </Ring>
                    </div>
                    <div style={{ fontSize: 12, color: C.green }}>+{Math.round(progress * 0.6)} Charged</div>
                    <div style={{ fontSize: 12, color: C.red }}>-{Math.round(progress * 0.4)} Drained</div>
                  </Card>

                  {/* Sleep — real bar chart */}
                  <Card>
                    <CardLabel>😴 SLEEP</CardLabel>
                    <BigVal size={22}>{data.profile?.avg_sleep
                      ? `${Math.floor(data.profile.avg_sleep / 60)}h ${Math.round(data.profile.avg_sleep % 60)}m`
                      : "6h 24m"}</BigVal>
                    <SubVal>Duration avg</SubVal>
                    <div style={{ marginTop: 8 }}>
                      <SparkBar data={sleepChart} color={C.purple} h={44} labels={chartLabels} />
                    </div>
                  </Card>

                  {/* HRV — REAL RMSSD from timeseries */}
                  <Card>
                    <CardLabel>💚 HRV STATUS</CardLabel>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: hrvColor,
                        boxShadow: `0 0 6px ${hrvColor}` }} />
                      <BigVal size={18} color={hrvColor}>{hrvStatus}</BigVal>
                    </div>
                    <BigVal size={24}>
                      {latestHrv7d != null ? latestHrv7d.toFixed(2) : "—"}
                      <span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}> RMSSD</span>
                    </BigVal>
                    <SubVal>7d Avg {ts ? "(real data)" : "(estimated)"}</SubVal>
                    <div style={{ marginTop: 8 }}>
                      <SparkLine data={hrvChart} color={hrvColor} h={36} />
                    </div>
                    <div style={{ fontSize: 9, color: C.sub, marginTop: 2 }}>
                      {ts ? `${ts.dates?.[0] ?? ""} → ${ts.dates?.[ts.dates.length - 1] ?? ""}` : "Last 4w"}
                    </div>
                  </Card>

                  {/* Training Load */}
                  <Card>
                    <CardLabel>🔄 TRAINING LOAD</CardLabel>
                    <BigVal size={20} color={fat.color}>{fat.label === "High" ? "Very high" : fat.label}</BigVal>
                    <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 2px" }}>
                      {Math.round(progress * 10 + 200)}/{Math.round(progress * 5 + 100)}
                    </div>
                    <SubVal>Acute/Chronic Load</SubVal>
                    <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>
                      {(progress / 50).toFixed(1)} <span style={{ fontSize: 11, color: C.sub }}>Load Ratio</span>
                    </div>
                  </Card>

                  {/* Training Status */}
                  <Card>
                    <CardLabel>📊 TRAINING STATUS</CardLabel>
                    <BigVal size={20}>{tsStatus}</BigVal>
                    <SubVal>Since last 4w</SubVal>
                    <div style={{ marginTop: 10 }}>
                      <StatusBar value={tsStatus} />
                    </div>
                  </Card>

                  {/* Stress */}
                  <Card>
                    <CardLabel>🧠 STRESS</CardLabel>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Ring pct={fat.pct} color={fat.color} size={68} stroke={7}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 800, color: fat.color }}>{fat.pct}</div>
                      </Ring>
                      <div style={{ flex: 1 }}>
                        <SparkBar data={stressChart.slice(0, 12)} color={fat.color} h={44} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.sub, marginTop: 2 }}>
                          <span>00</span><span>12</span><span>24</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Steps — real bar chart */}
                  <Card>
                    <CardLabel>👟 STEPS</CardLabel>
                    <BigVal size={24}>{(data.profile?.avg_steps ?? 7500).toLocaleString()}</BigVal>
                    <SubVal>Daily avg</SubVal>
                    <div style={{ marginTop: 8 }}>
                      <SparkBar data={stepsChart} color={C.blue} h={44} labels={chartLabels} />
                    </div>
                  </Card>

                  {/* Calories — real bar chart, full width */}
                  <Card span2>
                    <CardLabel>🔥 CALORIES</CardLabel>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                      <BigVal size={24}>{(data.profile?.avg_cal ?? 2200).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>kcal avg</span></BigVal>
                    </div>
                    <SparkBar data={calChart} color={C.orange} h={52} labels={chartLabels} />
                  </Card>

                  {/* Trends — full width */}
                  {data.trends && (
                    <Card span2>
                      <CardLabel>📈 TRENDS — LAST 4W</CardLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {[
                          { key: "step_trend",  icon: "👟", label: "Steps",      max: 600 },
                          { key: "sleep_trend", icon: "😴", label: "Sleep",      max: 60  },
                          { key: "hr_trend",    icon: "❤️", label: "Heart Rate", max: 20  },
                        ].filter(r => data.trends[r.key] != null).map(row => {
                          const v   = data.trends[row.key];
                          const pos = v > 0;
                          const tc  = row.key === "hr_trend" ? (pos ? C.red : C.green) : (pos ? C.green : C.red);
                          return (
                            <div key={row.key}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                  <span>{row.icon}</span>
                                  <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                  <span style={{ color: tc, fontSize: 12 }}>{pos ? "▲" : "▼"}</span>
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif",
                                    fontSize: 14, fontWeight: 700, color: tc }}>{Math.abs(v).toFixed(2)}</span>
                                </div>
                              </div>
                              <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
                                <div style={{ width: `${Math.min(Math.abs(v) / row.max * 100, 100)}%`,
                                  height: "100%", background: tc, borderRadius: 4,
                                  boxShadow: `0 0 6px ${tc}88`, transition: "width 1s ease" }} />
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

            {/* ══════════════ RECOVERY ══════════════ */}
            {tab === "recovery" && (
              <div className="fade">
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, marginBottom: 12, fontWeight: 600 }}>7-DAY RECOVERY PLAN</div>
                {!recovery ? (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <button className="pressable" onClick={fetchRecovery}
                      style={{ background: C.blue, borderRadius: 12, padding: "12px 28px",
                        color: "#fff", fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 14, letterSpacing: 1.5, fontWeight: 700 }}>GENERATE PLAN</button>
                  </div>
                ) : (
                  <>
                    <Card style={{ marginBottom: 12, display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div><CardLabel>FATIGUE</CardLabel><BigVal size={18} color={fat.color}>{fat.label}</BigVal></div>
                      <div><CardLabel>PROGRESS</CardLabel><BigVal size={18} color={C.blue}>{progress}%</BigVal></div>
                      <div><CardLabel>RECOVERY INDEX</CardLabel><BigVal size={18} color={hc}>{recovery.recovery_index ?? "—"}</BigVal></div>
                    </Card>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {(recovery.plan || []).map((item, i) => {
                        const isRest  = item.toLowerCase().includes("rest");
                        const isLight = item.toLowerCase().includes("light");
                        const dc = isRest ? C.blue : isLight ? C.amber : C.green;
                        const di = isRest ? "🛌" : isLight ? "🚶" : "🏃";
                        return (
                          <Card key={i} accent={dc}>
                            <div style={{ fontSize: 9, color: C.sub, letterSpacing: 1.5, marginBottom: 6 }}>DAY {i + 1} — {dayL[i] ?? ""}</div>
                            <div style={{ fontSize: 13, color: C.muted }}>{di} {item}</div>
                          </Card>
                        );
                      })}
                    </div>
                    <Card accent={C.green}>
                      <CardLabel color={C.green}>COACH NOTE</CardLabel>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                        Prioritise sleep quality and avoid high-intensity sessions until day 7. Stay hydrated and listen to your body.
                      </div>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* ══════════════ GOAL ══════════════ */}
            {tab === "goal" && (
              <div className="fade">
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2, marginBottom: 12, fontWeight: 600 }}>AI GOAL SYSTEM</div>
                {!goal ? (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <button className="pressable" onClick={fetchGoal}
                      style={{ background: C.green, borderRadius: 12, padding: "12px 28px",
                        color: C.bg, fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 14, letterSpacing: 1.5, fontWeight: 700 }}>GENERATE GOAL</button>
                  </div>
                ) : (
                  <>
                    <Card accent={C.green} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <CardLabel>CURRENT GOAL</CardLabel>
                          <BigVal size={28} color={C.green}>{goal.goal || "Active Recovery"}</BigVal>
                          <div style={{ fontSize: 12, color: C.blue, marginTop: 6 }}>Focus: {goal.focus || "Reduce load"}</div>
                        </div>
                        <div style={{ fontSize: 42 }}>🏆</div>
                      </div>
                    </Card>
                    <Card style={{ marginBottom: 10 }}>
                      <CardLabel>ACTION PLAN</CardLabel>
                      {(goal.plan || []).map((step, i) => {
                        const icons = ["💤","🗓️","🚶","💧","🧘","🏋️","📊","🎯"];
                        return (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0",
                            borderBottom: i < goal.plan.length - 1 ? `1px solid ${C.border}` : "none",
                            alignItems: "flex-start" }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%",
                              background: C.blue + "22", border: `1px solid ${C.blue}44`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, flexShrink: 0 }}>{icons[i % icons.length]}</div>
                            <div style={{ fontSize: 13, color: C.muted, paddingTop: 5, lineHeight: 1.4 }}>{step}</div>
                          </div>
                        );
                      })}
                    </Card>
                    {goal.explanation?.length > 0 && (
                      <Card accent={C.purple} style={{ marginBottom: 10 }}>
                        <CardLabel color={C.purple}>WHY THIS GOAL</CardLabel>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {goal.explanation.map((r, i) => (
                            <span key={i} style={{ background: C.purple + "22", border: `1px solid ${C.purple}44`,
                              borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#c084fc" }}>{r}</span>
                          ))}
                        </div>
                      </Card>
                    )}
                    {!showFeedback
                      ? <button className="pressable" onClick={() => setShowFeedback(true)}
                          style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 12, padding: 13, color: C.sub, fontSize: 12,
                            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                          📝 GIVE FEEDBACK ON THIS GOAL
                        </button>
                      : <FeedbackWidget userId={user.userId} goalName={goal.goal} onDone={() => setShowFeedback(false)} />
                    }
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom nav ─── */}
      {data && !loading && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0,
          background: C.card, borderTop: `1px solid ${C.border}`,
          display: "flex", zIndex: 200 }}>
          {tabs.map(t => (
            <button key={t.id} className="pressable" onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px 4px 11px", display: "flex",
                flexDirection: "column", alignItems: "center", gap: 3,
                color: tab === t.id ? C.blue : C.sub }}>
              <span style={{ fontSize: 19 }}>{t.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: 0.5, fontFamily: "'DM Sans', system-ui",
                fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
              {tab === t.id && (
                <div style={{ width: 22, height: 2.5, background: C.blue,
                  borderRadius: 2, boxShadow: `0 0 6px ${C.blue}` }} />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}