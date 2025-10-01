import React, { useEffect, useMemo, useState } from "react";
import { LIBRARIES } from "./library";
import LibraryPanel from "./components/LibraryPanel";

// Modern Dojo visual pass + Add/Remove Slice + Report shows Next-class per step
// Tailwind-based UI; no drag-and-drop (uses arrow buttons for ordering)

/* ================= Types ================= */

type Confidence = "low" | "med" | "high" | null;

type NextFlag = "review" | "reteach" | "teach" | null;

type Importance = "standard" | "important" | "critical";

type Step = {
  id: string;
  text: string;
  done: boolean;
  confidence: Confidence;
  next: NextFlag;
  importance: Importance;
};

type Slice = {
  id: string;
  title: string;
  indicator?: string;
  essential?: string;
  mistake?: string;
  steps: Step[];
  notes: string;
  checked: boolean;
  timestamp?: string | null;
  drillBaseSeconds: number;
  drillRunning: boolean;
  drillStartEpoch: number | null;
  gifUrl?: string | null;
};

type Lesson = {
  id: string;
  position: string;
  category: string;
  reference: string;
  setup: string;
  subPosition?: string;
  title: string;
  slices: Slice[];
};

 type Student = { id: string; name: string; creditsLeft?: number; startDate?: string };

type Session = {
  id: string;
  studentId: string;
  lessonId: string;
  date: string;
  minutes: number;
  nextPlan: Array<{ sliceTitle: string; stepText: string; action: NonNullable<NextFlag> }>;
};

type Plan = { id: string; name: string; date: string; lessons: Lesson[] };

/* ================= Utils ================= */

const uid = () => Math.random().toString(36).slice(2, 10);
const toClock = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
};

const COLORS: Record<string, string> = {
  Guard: "bg-indigo-600 text-white",
  Mount: "bg-amber-600 text-white",
  "Back Mount": "bg-violet-600 text-white",
  "Side Mount": "bg-green-600 text-white",
  "Half Guard": "bg-teal-600 text-white",
  "Modified Mount": "bg-zinc-600 text-white",
  "Leg Attack": "bg-rose-600 text-white",
};

const SLICE_BG = [
  "bg-indigo-50",
  "bg-emerald-50",
  "bg-purple-50",
  "bg-amber-50",
  "bg-rose-50",
  "bg-cyan-50",
];

const chip = {
  low: "bg-yellow-50 text-yellow-900 border border-yellow-200",
  med: "bg-blue-50 text-blue-900 border border-blue-200",
  high: "bg-emerald-50 text-emerald-900 border border-emerald-200",
  review: "bg-indigo-50 text-indigo-700 border border-indigo-300",
  reteach: "bg-rose-50 text-rose-700 border border-rose-200",
  teach: "bg-cyan-50 text-cyan-800 border border-cyan-200",
};

const importanceStyles: Record<Importance, string> = {
  standard: "border border-zinc-200",
  important: "border-2 border-blue-400",
  critical: "border-2 border-rose-500",
};

/* ================= Seed ================= */

const seedLesson = (): Lesson => ({
  id: `gp-${uid()}`,
  position: "Guard",
  category: "Pass",
  reference: "Master Cycle – BBS1 – Ch3.2, L19",
  setup: "Breaking the Guard",
  subPosition: "Split Knee Pass",
  title: "Knee Split Pass",
  slices: [
    {
      id: uid(),
      title: "Setup — Breaking the Guard",
      indicator: "Closed guard posture & opening mechanics.",
      essential: "Hip control prior to and during the stack.",
      mistake: "Letting the hips float during guard break.",
      steps: [
        { id: uid(), text: "Establish posture", done: false, confidence: null, next: null, importance: "important" },
        { id: uid(), text: "Control the pants", done: false, confidence: null, next: null, importance: "critical" },
        { id: uid(), text: "Walk knees back", done: false, confidence: null, next: null, importance: "standard" },
        { id: uid(), text: "Wedge knee at base of spine", done: false, confidence: null, next: null, importance: "important" },
        { id: uid(), text: "Open the other knee", done: false, confidence: null, next: null, importance: "standard" },
        { id: uid(), text: "Keep hips pinned; curl back; come up with the foot", done: false, confidence: null, next: null, importance: "critical" },
      ],
      notes: "",
      checked: false,
      timestamp: null,
      drillBaseSeconds: 0,
      drillRunning: false,
      drillStartEpoch: null,
      gifUrl: null,
    },
    {
      id: uid(),
      title: "Front Side",
      indicator: "Front-side knee-slice lane after guard opens.",
      essential: "Underhook threat; knee slice with head tight.",
      mistake: "Floating knee / losing underhook.",
      steps: [
        { id: uid(), text: "Left hand hook leg", done: false, confidence: null, next: null, importance: "important" },
        { id: uid(), text: "Right hand holds leg down", done: false, confidence: null, next: null, importance: "critical" },
        { id: uid(), text: "Knee drop (ankle over thigh)", done: false, confidence: null, next: null, importance: "critical" },
        { id: uid(), text: "Drop chest", done: false, confidence: null, next: null, importance: "important" },
        { id: uid(), text: "Hug the neck (right hand)", done: false, confidence: null, next: null, importance: "important" },
      ],
      notes: "",
      checked: false,
      timestamp: null,
      drillBaseSeconds: 0,
      drillRunning: false,
      drillStartEpoch: null,
      gifUrl: null,
    },
  ],
});

/* ================= Component ================= */

export default function LessonPlanBuilder() {
  // Student state must be declared before usage
  const [studentList, setStudentList] = useState<Student[]>([
    { id: "s1", name: "Student 1", creditsLeft: 4, startDate: new Date().toISOString().slice(0, 10) },
  ]);
  const [studentId, setStudentId] = useState<string>("s1");
  const [editingStudent, setEditingStudent] = useState(false);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">("light");
  const [tab, setTab] = useState<"coach" | "report" | "library" | "tags">("coach");
  const [layout, setLayout] = useState<"stacked" | "columns">("stacked");

  // Per-student plans
  const [plansByStudent, setPlansByStudent] = useState<Record<string, Plan[]>>({
    s1: [
      { id: uid(), name: "Plan 1", date: new Date().toISOString().slice(0, 10), lessons: [seedLesson()] },
    ],
  });

  // The currently selected student's plans
  const plans = plansByStudent[studentId] ?? [];

  // Selected plan for current student
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null);

  // Which lesson inside the selected plan is open
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
// #region THEME EFFECT

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    if (theme === "light") root.classList.remove("dark");
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => (mq.matches ? root.classList.add("dark") : root.classList.remove("dark"));
      apply();
      const h = (e: MediaQueryListEvent) => (e.matches ? root.classList.add("dark") : root.classList.remove("dark"));
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    }
  }, [theme]);
  // Ensure the selected student always has at least one plan
useEffect(() => {
  setPlansByStudent((prev) => {
    if ((prev[studentId]?.length ?? 0) > 0) return prev;
    return {
      ...prev,
      [studentId]: [
        { id: uid(), name: "Plan 1", date: new Date().toISOString().slice(0, 10), lessons: [seedLesson()] },
      ],
    };
  });
}, [studentId]);

// Keep selectedPlanId in sync when switching students/plans
useEffect(() => {
  if (!selectedPlanId && plans[0]) setSelectedPlanId(plans[0].id);
}, [plans, selectedPlanId]);



  const plan = useMemo(() => {
  const byId = plans.find((p) => p.id === selectedPlanId);
  return byId ?? plans[0];
}, [plans, selectedPlanId]);

if (!plan) {
  // Render nothing until the plan exists (very rare flicker on first student switch)
  return <div className="p-4 text-sm text-slate-600">Preparing plan…</div>;
}

  const lesson = plan.lessons[currentLessonIndex];

  // global timer
  const [running, setRunning] = useState(false);
  const [startEpoch, setStartEpoch] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startEpoch) setElapsed(Math.floor((Date.now() - startEpoch) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running, startEpoch]);

  const anyDrillRunning = useMemo(() => lesson?.slices.some((s) => s.drillRunning) ?? false, [lesson]);
  const [drillTick, setDrillTick] = useState(0);
  useEffect(() => {
    if (!anyDrillRunning) return;
    const id = setInterval(() => setDrillTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [anyDrillRunning]);
  drillTick;

  const posBadge = lesson ? COLORS[lesson.position] || "bg-zinc-600 text-white" : "";
  const titleFormula = lesson ? `${lesson.position} pass, (${lesson.reference})` : "";

 function updateCurrentStudentPlans(mut: (arr: Plan[]) => Plan[]) {
  setPlansByStudent((prev) => {
    const curr = prev[studentId] ?? [];
    return { ...prev, [studentId]: mut(curr) };
  });
}

function replaceLesson(mut: (l: Lesson) => Lesson) {
  updateCurrentStudentPlans((arr) =>
    arr.map((p) =>
      p.id !== selectedPlanId
        ? p
        : {
            ...p,
            lessons: p.lessons.map((L, i) => (i === currentLessonIndex ? mut(L) : L)),
          }
    )
  );
}

  function setLessonField(patch: Partial<Lesson>) { replaceLesson((l) => ({ ...l, ...patch })); }
  function setSlice(idx: number, patch: Partial<Slice>) {
    replaceLesson((l) => { const slices = [...l.slices]; slices[idx] = { ...slices[idx], ...patch }; return { ...l, slices }; });
  }
  function setStep(si: number, ti: number, patch: Partial<Step>) {
    replaceLesson((l) => { const slices = [...l.slices]; const steps = [...slices[si].steps]; steps[ti] = { ...steps[ti], ...patch } as Step; slices[si] = { ...slices[si], steps }; return { ...l, slices }; });
  }

  // ordering via arrows only
  function moveSlice(oldIndex: number, newIndex: number) {
    replaceLesson((l) => {
      const slices = [...l.slices];
      if (newIndex < 0 || newIndex >= slices.length) return l;
      const [moved] = slices.splice(oldIndex, 1);
      slices.splice(newIndex, 0, moved);
      return { ...l, slices };
    });
  }

  function addSlice() {
    replaceLesson((l) => ({
      ...l,
      slices: [
        ...l.slices,
        {
          id: uid(),
          title: `Slice ${l.slices.length}`,
          indicator: "",
          essential: "",
          mistake: "",
          steps: [{ id: uid(), text: "", done: false, confidence: null, next: null, importance: "standard" }],
          notes: "",
          checked: false,
          timestamp: null,
          drillBaseSeconds: 0,
          drillRunning: false,
          drillStartEpoch: null,
          gifUrl: null,
        },
      ],
    }));
  }
  function removeSlice(idx: number) {
    replaceLesson((l) => ({ ...l, slices: l.slices.filter((_, i) => i !== idx) }));
  }

  function addStep(si: number) { setSlice(si, { steps: [...lesson.slices[si].steps, { id: uid(), text: "", done: false, confidence: null, next: null, importance: "standard" }] }); }
  function removeStep(si: number, ti: number) { const steps = [...lesson.slices[si].steps]; steps.splice(ti, 1); setSlice(si, { steps }); }
  function moveStep(si: number, ti: number, dir: "up" | "down") { const steps = [...lesson.slices[si].steps]; const ni = dir === "up" ? ti - 1 : ti + 1; if (ni < 0 || ni >= steps.length) return; const t = steps[ti]; steps[ti] = steps[ni]; steps[ni] = t; setSlice(si, { steps }); }

  // global timer controls
  function startTimer() { if (running) return; const now = Date.now(); setStartEpoch(now - elapsed * 1000); setRunning(true); }
  function pauseTimer() { setRunning(false); }
  function finishTimer() {
    setRunning(false); setStartEpoch(null);
    const minutes = Math.floor(elapsed / 60);
    setElapsed(0);
    replaceLesson((l) => ({ ...l, slices: l.slices.map((s) => ({ ...s, checked: false, timestamp: null })) }));
  }

  function drillSecondsFor(s: Slice) { return s.drillRunning && s.drillStartEpoch ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000) : s.drillBaseSeconds; }
  function startDrill(idx: number) { setSlice(idx, { drillRunning: true, drillStartEpoch: Date.now() }); }
  function pauseDrill(idx: number) { const s = lesson.slices[idx]; setSlice(idx, { drillRunning: false, drillStartEpoch: null, drillBaseSeconds: drillSecondsFor(s) }); }
  function resetDrill(idx: number) { setSlice(idx, { drillRunning: false, drillStartEpoch: null, drillBaseSeconds: 0 }); }

  /* ========== UI ========== */

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 text-sm text-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button className={`px-3 py-1.5 rounded-xl border ${"plan" === "plan" ? "bg-white" : ""}`} onClick={() => {}} disabled>Plan</button>
        <button className={`px-3 py-1.5 rounded-xl border bg-white`}>Lesson</button>
        <div className="ml-auto flex items-center gap-2">
          <select className="border rounded-xl px-2 py-1.5" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {studentList.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          {editingStudent ? (
            <input autoFocus className="border rounded-xl px-2 py-1.5" value={studentList.find((s) => s.id === studentId)?.name || ""} onChange={(e) => setStudentList((prev) => prev.map((s) => (s.id === studentId ? { ...s, name: e.target.value } : s)))} onBlur={() => setEditingStudent(false)} />
          ) : (
            <button className="px-3 py-1.5 rounded-xl border" onClick={() => setEditingStudent(true)}>Edit Name</button>
          )}
          <input type="number" min={0} className="w-20 border rounded-xl px-2 py-1.5" value={studentList.find((s)=>s.id===studentId)?.creditsLeft ?? 0} onChange={(e)=>{ const v=Number(e.target.value); setStudentList(prev=>prev.map(s=>s.id===studentId?{...s,creditsLeft:v}:s)); }} placeholder="Credits"/>
          <input type="date" className="border rounded-xl px-2 py-1.5" value={studentList.find((s)=>s.id===studentId)?.startDate ?? ""} onChange={(e)=>{ const v=e.target.value; setStudentList(prev=>prev.map(s=>s.id===studentId?{...s,startDate:v}:s)); }}/>
          <button className="px-3 py-1.5 rounded-xl border" onClick={()=> setStudentList(prev=>[...prev,{id:uid(), name:`Student ${prev.length+1}`, creditsLeft:5, startDate:new Date().toISOString().slice(0,10)}])}>+ Student</button>
          <select className="border rounded-xl px-2 py-1.5" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Title row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{titleFormula}</h1>
          <div className="text-xs md:text-sm text-slate-600">
            Class: <span className="font-medium">{lesson.id} — {lesson.title}</span> • Setup: <span className="font-medium">{lesson.setup}</span> • Sub-position: <span className="font-medium">{lesson.subPosition || "—"}</span>
          </div>
          <div className="mt-1 text-[12px] md:text-sm text-slate-600 flex flex-wrap gap-3">
            <span>Student: <span className="font-medium">{studentList.find((s) => s.id === studentId)?.name || "—"}</span></span>
            <span>•</span>
            <span>Credits left: <span className="font-medium">{studentList.find((s) => s.id === studentId)?.creditsLeft ?? "—"}</span></span>
            <span>•</span>
            <span>Start date: <span className="font-medium">{studentList.find((s) => s.id === studentId)?.startDate || "—"}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${posBadge}`}>{lesson.position}</span>
          <span className="text-xs px-2 py-1 rounded-full border border-zinc-300">{lesson.category}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={`px-3 py-1.5 rounded-xl border ${tab === "coach" ? "bg-white" : ""}`} onClick={() => setTab("coach")}>Coach Mode</button>
        <button className={`px-3 py-1.5 rounded-xl border ${tab === "report" ? "bg-white" : ""}`} onClick={() => setTab("report")}>Report</button>
        <button className={`px-3 py-1.5 rounded-xl border ${tab === "library" ? "bg-white" : ""}`} onClick={() => setTab("library")}>Library</button>
        <button className={`px-3 py-1.5 rounded-xl border ${tab === "tags" ? "bg-white" : ""}`} onClick={() => setTab("tags")}>Tags</button>
        <div className="ml-2 flex items-center gap-1 text-xs">
          <span className="opacity-70">Layout:</span>
          <button className={`px-2 py-1 rounded-lg border ${"stacked"===layout?"bg-white":""}`} onClick={()=>setLayout("stacked")}>Stacked</button>
          <button className={`px-2 py-1 rounded-lg border ${"columns"===layout?"bg-white":""}`} onClick={()=>setLayout("columns")}>Columns</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-xl border" onClick={startTimer}>Start</button>
          <button className="px-3 py-1.5 rounded-xl border" onClick={pauseTimer}>Pause</button>
          <button className="px-3 py-1.5 rounded-xl border" onClick={finishTimer}>Finish</button>
          <div className="text-xs text-slate-600">Timer: <span className="font-mono">{toClock(elapsed)}</span></div>
        </div>
      </div>

      {/* Coach Mode */}
      {tab === "coach" && (
        <div>
          <div className="flex items-center gap-2 mb-2 mt-3">
            <button className="px-3 py-1.5 rounded-xl border" onClick={addSlice}>+ Slice</button>
          </div>
          <div className={layout === 'stacked' ? "grid md:grid-cols-2 gap-4 mt-2" : "grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 auto-rows-[1fr]"}>
            {lesson.slices.map((s, i) => (
              <div key={s.id} className={`rounded-2xl border p-3 shadow-sm bg-white ${SLICE_BG[i % SLICE_BG.length]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={!!s.checked} onChange={(e)=> setSlice(i,{ checked:e.target.checked, timestamp: e.target.checked && startEpoch ? toClock(Math.floor((Date.now() - startEpoch) / 1000)) : null })} />
                  <input className="font-medium bg-transparent border-b border-transparent focus:border-zinc-400 outline-none flex-1" value={`${s.title}`} onChange={(e)=>setSlice(i,{ title: e.target.value })} />
                  {s.timestamp && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 ml-auto">{s.timestamp}</span>}
                  <span className="ml-auto flex items-center gap-1">
                    <button className="px-2 py-0.5 text-xs rounded border" onClick={()=>moveSlice(i,i-1)} disabled={i===0}>↑</button>
                    <button className="px-2 py-0.5 text-xs rounded border" onClick={()=>moveSlice(i,i+1)} disabled={i===lesson.slices.length-1}>↓</button>
                    <button className="px-2 py-0.5 text-xs rounded border" onClick={()=>removeSlice(i)} title="Remove slice">✕</button>
                  </span>
                </div>

                {(s.indicator || s.essential || s.mistake) && (
                  <div className="text-xs space-y-1">
                    <div className="flex gap-2 items-center"><b>Indicator:</b><input className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none" value={s.indicator} onChange={(e)=>setSlice(i,{indicator:e.target.value})} /></div>
                    <div className="flex gap-2 items-center"><b>Essential:</b><input className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none" value={s.essential} onChange={(e)=>setSlice(i,{essential:e.target.value})} /></div>
                    <div className="flex gap-2 items-center"><b>Mistake:</b><input className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none" value={s.mistake} onChange={(e)=>setSlice(i,{mistake:e.target.value})} /></div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs">Drill time:</span>
                      <span className="text-sm font-mono">{toClock(s.drillRunning && s.drillStartEpoch ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000) : s.drillBaseSeconds)}</span>
                      {!s.drillRunning ? (
                        <>
                          <button className="px-2 py-1 text-xs rounded border" onClick={()=>startDrill(i)}>Start</button>
                          <button className="px-2 py-1 text-xs rounded border" onClick={()=>resetDrill(i)}>Reset</button>
                        </>
                      ) : (
                        <button className="px-2 py-1 text-xs rounded border" onClick={()=>pauseDrill(i)}>Pause</button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <div className="text-xs text-slate-600 mb-1">Order of operations</div>
                  <div className="space-y-2">
                    {s.steps.map((st, j) => (
                      <div key={st.id} className={`rounded-xl p-2 ${importanceStyles[st.importance]} bg-white/80`}>
                        <div className="flex items-start gap-2 flex-wrap">
                          <input type="checkbox" checked={!!st.done} onChange={(e)=>setStep(i, j, { done: e.target.checked })} />
                          <textarea rows={2} className="w-full bg-transparent border rounded p-1 border-zinc-200" value={st.text} onChange={(e)=>setStep(i, j, { text: e.target.value })} />
                          <div className="flex items-center gap-2 ml-auto">
                            <button className="px-2 py-1 rounded border" disabled={j===0} onClick={()=>moveStep(i,j,"up")}>↑</button>
                            <button className="px-2 py-1 rounded border" disabled={j===s.steps.length-1} onClick={()=>moveStep(i,j,"down")}>↓</button>
                            <button className="px-2 py-1 rounded border" onClick={()=>removeStep(i,j)}>✕</button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs">Confidence:</span>
                          {(["low","med","high"] as const).map((lvl) => (
                            <button key={lvl} className={`text-xs px-2 py-1 rounded-full font-medium ${st.confidence===lvl ? chip[lvl] : 'border border-zinc-300'}`} onClick={()=>setStep(i, j, { confidence: st.confidence===lvl ? null : lvl })}>{lvl}</button>
                          ))}
                          <span className="text-xs ml-2">Next class:</span>
                          {(["review","reteach","teach"] as const).map((opt) => (
                            <button key={opt} className={`text-xs px-2 py-1 rounded-full font-medium ${st.next===opt ? chip[opt] : 'border border-zinc-300'}`} onClick={()=>setStep(i, j, { next: st.next===opt ? null : opt })}>{opt === "review" ? "Quick review" : opt === "reteach" ? "Reteach" : "Teach"}</button>
                          ))}
                          <span className="text-xs ml-2">Importance:</span>
                          {(["standard","important","critical"] as Importance[]).map((lvl) => (
                            <button key={lvl} className={`text-xs px-2 py-1 rounded ${st.importance===lvl ? importanceStyles[lvl] : 'border border-zinc-300'}`} onClick={()=>setStep(i, j, { importance: lvl })}>{lvl}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-2 text-xs px-3 py-1 rounded bg-zinc-100 border" onClick={() => addStep(i)}>+ Add step</button>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-600 mb-1">Slice notes</div>
                  <textarea className="w-full border rounded p-2 bg-transparent border-zinc-200" value={s.notes} onChange={(e)=>setSlice(i,{ notes: e.target.value })} placeholder="Coaching notes, observations, cues…" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report */}
      {tab === "report" && (
        <div className="mt-4 p-3 rounded-2xl border bg-white">
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded ${posBadge}`}>{lesson.position}</span>
            <span className="px-2 py-0.5 rounded border border-zinc-300">{lesson.category}</span>
            <span className="text-slate-600">{titleFormula}</span>
          </div>
          <div className="mt-3 space-y-3">
            {lesson.slices.map((s, i) => (
              <div key={s.id} className="rounded-xl border p-3">
                <div className="font-medium mb-1 flex items-center gap-2">
                  {`${i}. ${s.title}`} {s.timestamp && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100">{s.timestamp}</span>}
                  <span className="ml-2 text-[11px] italic text-slate-500">Drill: {toClock(s.drillRunning && s.drillStartEpoch ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000) : s.drillBaseSeconds)}</span>
                </div>
                {s.notes && (<div className="text-xs mb-2"><b>Notes:</b> {s.notes}</div>)}
                <ol className="list-decimal ml-6 space-y-1">
                  {s.steps.map((st, j) => (
                    <li key={st.id} className={`${j % 2 ? 'bg-neutral-50' : ''} rounded-sm px-1`}> 
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                        <div>
                          {st.text || <span className="text-slate-400">(empty step)</span>} {st.done ? "✅" : ""}
                          {st.importance !== 'standard' && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${st.importance==='important' ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>{st.importance}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Conf: {st.confidence || '—'}</span>
                          <span>Next: {st.next || '—'}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
  </div>
)}

{/* Library */}
{tab === "library" && (
  <LibraryPanel
    lessonsByCourse={LIBRARIES}
    onAdd={(libraryLesson: Lesson) => {
      const uidLocal = () => Math.random().toString(36).slice(2, 10);

      const cloned: Lesson = {
        ...libraryLesson,
        id: `lesson-${uidLocal()}`,
        slices: (libraryLesson.slices ?? []).map((S: Slice) => ({
          ...S,
          id: `slice-${uidLocal()}`,
          steps: (S.steps ?? []).map((st: Step) => ({ ...st, id: `step-${uidLocal()}` })),
        })),
      };

      setPlansByStudent((prev) => {
        const studentPlans = prev[studentId] ?? [];
        const updatedPlans = studentPlans.map((p) =>
          p.id === selectedPlanId ? { ...p, lessons: [...p.lessons, cloned] } : p
        );
        return { ...prev, [studentId]: updatedPlans };
      });

      setTab("coach");
    }}   // ✅ this closes onAdd correctly
  />
)}


      {/* Tags */}
      {tab === "tags" && (
        <div className="mt-4 p-3 rounded-2xl border bg-white space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><div className="text-xs text-slate-600">Position</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.position} onChange={(e)=>setLessonField({ position: e.target.value })} /></div>
            <div><div className="text-xs text-slate-600">Category</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.category} onChange={(e)=>setLessonField({ category: e.target.value })} /></div>
            <div><div className="text-xs text-slate-600">Reference</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.reference} onChange={(e)=>setLessonField({ reference: e.target.value })} /></div>
            <div><div className="text-xs text-slate-600">Setup</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.setup} onChange={(e)=>setLessonField({ setup: e.target.value })} /></div>
            <div><div className="text-xs text-slate-600">Sub-position</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.subPosition || ''} onChange={(e)=>setLessonField({ subPosition: e.target.value })} /></div>
            <div><div className="text-xs text-slate-600">Lesson Title</div><input className="w-full border rounded p-2 bg-transparent" value={lesson.title} onChange={(e)=>setLessonField({ title: e.target.value })} /></div>
          </div>
          <div className="text-xs text-slate-600">Title format → <code>{`${lesson.position} pass, (${lesson.reference})`}</code></div>
        </div>
      )}
    </div>
  );
}
