import React, { useEffect, useMemo, useState } from "react";
import { LIBRARIES } from "./library";
import LibraryPanel from "./components/LibraryPanel";
// ---------- Persistence helpers ----------
const STORAGE_KEY = "bjj-planner-state:v2";
type TabType = "coach" | "report" | "library" | "tags";
type TopTabType = "plan" | "lesson";

type RootState = {
  version: 1;
  plans: Plan[];
  selectedPlanId: string;
  currentLessonIndex: number;
  studentList: Student[];
  studentId: string;
  theme: "auto" | "light" | "dark";
  history: Session[];
  topTab: TopTabType;
tab: TabType;
};

function safeParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function loadState(): Partial<RootState> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return safeParse<Partial<RootState>>(raw) ?? {};
}

function saveState(state: RootState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
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

type Student = { id: string; name: string };

type Session = {
  id: string;
  studentId: string;
  lessonId: string;
  date: string;
  minutes: number;
  nextPlan: Array<{ sliceTitle: string; stepText: string; action: NonNullable<NextFlag> }>;
};

type Plan = { id: string; name: string; date: string; lessons: Lesson[]; studentId: string };

/* =============== Utils =============== */

const uid = () => Math.random().toString(36).slice(2, 10);
function cloneLibraryLesson(src: Lesson): Lesson {
  const freshId = () => Math.random().toString(36).slice(2, 10);
  const l = structuredClone(src);
  l.id = `lesson-${freshId()}`;
  l.slices = (l.slices ?? []).map(s => ({
    ...s,
    id: `slice-${freshId()}`,
    steps: (s.steps ?? []).map(st => ({ ...st, id: `step-${freshId()}` }))
  }));
  return l;
}

const toClock = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
};
// ---------- UI tokens (ADHD-friendly, readable) ----------
const RING = "focus:outline-none focus:ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400";
const BTN_BASE = "px-3 py-1 rounded border shadow-sm transition " + RING;

const BTN = BTN_BASE + " bg-white/80 dark:bg-zinc-800/80 hover:shadow";
const BTN_SOFT = BTN_BASE + " bg-zinc-100 text-zinc-900 dark:bg-zinc-700/60 dark:text-zinc-100";
const BTN_POS = BTN_BASE + " bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200";
const BTN_NEG = BTN_BASE + " bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
const BTN_TAB_ACTIVE = BTN_BASE + " bg-white dark:bg-zinc-700";
const BTN_TAB = BTN_BASE + " bg-transparent";

/* =============== Seed Lesson =============== */

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
        { id: uid(), text: "Control the pants", done: false, confidence: null, next: null, importance: "standard" },
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
        { id: uid(), text: "Left hand hook leg", done: false, confidence: null, next: null, importance: "standard" },
        { id: uid(), text: "Right hand holds leg down", done: false, confidence: null, next: null, importance: "standard" },
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
function defaultState(): RootState {
  const firstPlan: Plan = {
  id: uid(),
  name: "Plan 1",
  date: new Date().toISOString().slice(0, 10),
  lessons: [seedLesson()],
  studentId: "s1", // <-- add this
};

  return {
    version: 1,
    plans: [firstPlan],
    selectedPlanId: firstPlan.id,
    currentLessonIndex: 0,
    studentList: [{ id: "s1", name: "Student 1" }],
    studentId: "s1",
    theme: "auto",
    history: [],
    topTab: "lesson",
    tab: "coach",
  };
}

function loadStateOrDefault(): RootState {
  const base = defaultState();
  const persisted = loadState();

  const merged: RootState = {
    version: 1,
    plans: Array.isArray(persisted.plans) && persisted.plans.length ? persisted.plans : base.plans,
    selectedPlanId: typeof persisted.selectedPlanId === "string" ? persisted.selectedPlanId : base.selectedPlanId,
    currentLessonIndex: Number.isInteger(persisted.currentLessonIndex) ? (persisted.currentLessonIndex as number) : base.currentLessonIndex,
    studentList: Array.isArray(persisted.studentList) && persisted.studentList.length ? persisted.studentList : base.studentList,
    studentId: typeof persisted.studentId === "string" ? persisted.studentId : base.studentId,
    theme: (persisted.theme as RootState["theme"]) ?? base.theme,
    history: Array.isArray(persisted.history) ? persisted.history as Session[] : base.history,
    topTab: (persisted.topTab as TopTabType) ?? base.topTab,
tab: (persisted.tab as TabType) ?? base.tab,
  };

  // Ensure we always have at least one plan
  if (!merged.plans.length) {
    const p = defaultState();
    merged.plans = p.plans;
    merged.selectedPlanId = p.selectedPlanId;
    merged.currentLessonIndex = 0;
  }

  // Ensure selectedPlanId is valid
  if (!merged.plans.some(p => p.id === merged.selectedPlanId)) {
    merged.selectedPlanId = merged.plans[0].id;
    merged.currentLessonIndex = 0;
  }

  return merged;
}

/* =============== Component =============== */

export default function LessonPlanBuilder() {
 // Consolidated initial state (parsed once)
  const initial = useMemo(() => loadStateOrDefault(), []);

  // Plans / lessons
const [plans, setPlans] = useState<Plan[]>(initial.plans);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(initial.selectedPlanId);

 const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(initial.currentLessonIndex);


  // Students / theme
 const [studentList, setStudentList] = useState<Student[]>(initial.studentList);

 const [studentId, setStudentId] = useState<string>(initial.studentId);

 const [editingStudent, setEditingStudent] = useState<boolean>(false);
const [theme, setTheme] = useState<"auto" | "light" | "dark">(initial.theme);

  // History + tabs
 const [history, setHistory] = useState<Session[]>(initial.history);

  const [tab, setTab] = useState<TabType>(initial.tab);
const [topTab, setTopTab] = useState<TopTabType>(initial.topTab);

// ---- Guard: keep selectedPlanId valid whenever plans change
useEffect(() => {
  // If the currently selected plan no longer exists (e.g., deleted or after import),
  // fall back to the first available plan and reset the lesson index.
  if (!plans.some(p => p.id === selectedPlanId)) {
    const nextId = plans[0]?.id ?? "";
    if (nextId !== selectedPlanId) {
      setSelectedPlanId(nextId);
      setCurrentLessonIndex(0);
    }
  }
}, [plans, selectedPlanId]);
// ---- Guard: keep currentLessonIndex within bounds for the selected plan
useEffect(() => {
  const plan = plans.find(p => p.id === selectedPlanId);
  if (!plan) return;
  if (currentLessonIndex < 0 || currentLessonIndex >= plan.lessons.length) {
    setCurrentLessonIndex(Math.min(Math.max(0, currentLessonIndex), Math.max(0, plan.lessons.length - 1)));
  }
}, [plans, selectedPlanId, currentLessonIndex]);

  // Persistence: Save to localStorage on state changes
  useEffect(() => {
  const stateToSave: RootState = {
    version: 1,
    plans,
    selectedPlanId,
    currentLessonIndex,
    studentList,
    studentId,
    theme,
    history,
    topTab,
    tab,
  };
  saveState(stateToSave);
}, [plans, selectedPlanId, currentLessonIndex, studentList, studentId, theme, history, topTab, tab]);


  // Dark mode sync
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    if (theme === "light") root.classList.remove("dark");
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => (mq.matches ? root.classList.add("dark") : root.classList.remove("dark"));
      apply();
      const h = (e: MediaQueryListEvent) =>
        e.matches ? root.classList.add("dark") : root.classList.remove("dark");
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    }
  }, [theme]);

  const plan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];
  const lesson = plan?.lessons?.[currentLessonIndex];
  if (!plan || !lesson) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 text-sm">
        <div className="mb-3">Preparing your plan…</div>
        <div className="text-xs opacity-70">Tip: make sure a plan is selected and contains at least one lesson.</div>
      </div>
    );
  }

  // Class timer (top-right)
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

  // Drill ticker (per-slice)
  const anyDrillRunning = useMemo(() => lesson?.slices.some((s) => s.drillRunning) ?? false, [lesson]);
  const [drillTick, setDrillTick] = useState(0);
  useEffect(() => {
    if (!anyDrillRunning) return;
    const id = setInterval(() => setDrillTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [anyDrillRunning]);

  const titleFormula = lesson ? `${lesson.position} ${lesson.category.toLowerCase()}, (${lesson.reference})` : "";
  const posKey = lesson.position.toLowerCase().replace(/\s+/g, '-');

  /* =============== Mutators =============== */

  function replaceLesson(mut: (l: Lesson) => Lesson) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id !== selectedPlanId ? p : { ...p, lessons: p.lessons.map((L, i) => (i === currentLessonIndex ? mut(L) : L)) }
      )
    );
  }
  function setLessonField(patch: Partial<Lesson>) {
    replaceLesson((l) => ({ ...l, ...patch }));
  }
  function setSlice(idx: number, patch: Partial<Slice>) {
    replaceLesson((l) => {
      const slices = [...l.slices];
      slices[idx] = { ...slices[idx], ...patch };
      return { ...l, slices };
    });
  }
  function setStep(si: number, ti: number, patch: Partial<Step>) {
    replaceLesson((l) => {
      const slices = [...l.slices];
      const steps = [...slices[si].steps];
      steps[ti] = { ...steps[ti], ...patch } as Step;
      slices[si] = { ...slices[si], steps };
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
  function addStep(si: number) {
    setSlice(si, {
      steps: [
        ...lesson.slices[si].steps,
        { id: uid(), text: "", done: false, confidence: null, next: null, importance: "standard" },
      ],
    });
  }
  function removeStep(si: number, ti: number) {
    const steps = [...lesson.slices[si].steps];
    steps.splice(ti, 1);
    setSlice(si, { steps });
  }
  function moveStep(si: number, ti: number, dir: "up" | "down") {
    const steps = [...lesson.slices[si].steps];
    const ni = dir === "up" ? ti - 1 : ti + 1;
    if (ni < 0 || ni >= steps.length) return;
    const t = steps[ti];
    steps[ti] = steps[ni];
    steps[ni] = t;
    setSlice(si, { steps });
  }

  function toggleSliceDone(i: number, val: boolean) {
    setSlice(i, {
      checked: val,
      timestamp: val && startEpoch ? toClock(Math.floor((Date.now() - startEpoch) / 1000)) : null,
    });
  }

  function startTimer() {
    if (running) return;
    const now = Date.now();
    setStartEpoch(now - elapsed * 1000);
    setRunning(true);
  }
  function pauseTimer() {
    setRunning(false);
  }
  function finishTimer() {
    setRunning(false);
    setStartEpoch(null);
    const minutes = Math.floor(elapsed / 60);
    setHistory((prev) => [
      ...prev,
      {
        id: uid(),
        studentId,
        lessonId: lesson.id,
        date: new Date().toISOString().slice(0, 10),
        minutes,
        nextPlan: lesson.slices.flatMap((sl) =>
          sl.steps
            .filter((st) => !!st.next)
            .map((st) => ({ sliceTitle: sl.title, stepText: st.text, action: st.next! }))
        ),
      },
    ]);
    setElapsed(0);
    replaceLesson((l) => ({ ...l, slices: l.slices.map((s) => ({ ...s, checked: false, timestamp: null })) }));
  }

  function drillSecondsFor(s: Slice) {
    return s.drillRunning && s.drillStartEpoch
      ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000)
      : s.drillBaseSeconds;
  }
  function startDrill(idx: number) {
    setSlice(idx, { drillRunning: true, drillStartEpoch: Date.now() });
  }
  function pauseDrill(idx: number) {
    const s = lesson.slices[idx];
    setSlice(idx, { drillRunning: false, drillStartEpoch: null, drillBaseSeconds: drillSecondsFor(s) });
  }
  function resetDrill(idx: number) {
    setSlice(idx, { drillRunning: false, drillStartEpoch: null, drillBaseSeconds: 0 });
  }
  function onGifChange(idx: number, file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSlice(idx, { gifUrl: url });
  }

  // Plans / lessons mgmt
  function addPlan() {
  // count existing plans for this student (optional, just for nicer naming)
  const countForStudent = plans.filter(p => p.studentId === studentId).length;

  const np: Plan = {
    id: uid(),
    name: `Plan ${countForStudent + 1}`,
    date: new Date().toISOString().slice(0, 10),
    lessons: [seedLesson()],
    studentId, // <-- attach ownership
  };

  setPlans(prev => [...prev, np]);
  setSelectedPlanId(np.id);
  setCurrentLessonIndex(0);
}

  function renamePlan(name: string) {
    setPlans((prev) => prev.map((p) => (p.id === selectedPlanId ? { ...p, name } : p)));
  }
  function setPlanDate(date: string) {
    setPlans((prev) => prev.map((p) => (p.id === selectedPlanId ? { ...p, date } : p)));
  }
  function addLessonToPlan() {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === selectedPlanId ? { ...p, lessons: [...p.lessons, seedLesson()] } : p
      )
    );
    setCurrentLessonIndex(plan.lessons.length);
  }
  function duplicateLesson(idx: number) {
    const copy = JSON.parse(JSON.stringify(lesson)) as Lesson;
    copy.id = `copy-${uid()}`;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPlanId) return p;
        const lessons = [...p.lessons];
        lessons.splice(idx + 1, 0, copy);
        return { ...p, lessons };
      })
    );
    setCurrentLessonIndex(idx + 1);
  }
  function removeLesson(idx: number) {
    if (plan.lessons.length <= 1) return;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === selectedPlanId ? { ...p, lessons: p.lessons.filter((_, i) => i !== idx) } : p
      )
    );
    setCurrentLessonIndex(Math.max(0, idx - 1));
  }
  function moveLesson(idx: number, dir: "up" | "down") {
    const lessons = [...plan.lessons];
    const ni = dir === "up" ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= lessons.length) return;
    const t = lessons[idx];
    lessons[idx] = lessons[ni];
    lessons[ni] = t;
    setPlans((prev) => prev.map((p) => (p.id === selectedPlanId ? { ...p, lessons } : p)));
    setCurrentLessonIndex(ni);
  }

  function exportPlanJSON() {
    const payload = {
      plan: { id: plan.id, name: plan.name, date: plan.date },
      student: studentList.find((s) => s.id === studentId)?.name || "(Student)",
      lessons: plan.lessons.map((L) => ({
        id: L.id,
        title: L.title,
        tags: { position: L.position, category: L.category, reference: L.reference, setup: L.setup, subPosition: L.subPosition || "" },
        slices: L.slices.map((s, i) => ({
          number: i,
          title: s.title,
          timestamp: s.timestamp,
          drillTime: toClock(drillSecondsFor(s)),
          gifUrl: s.gifUrl || null,
          notes: s.notes,
          steps: s.steps.map((st) => ({
            text: st.text,
            done: st.done,
            confidence: st.confidence,
            next: st.next,
            importance: st.importance,
          })),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan_${plan.name.replace(/\s+/g, "_")}_${plan.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* =============== Render =============== */

  return (
    <div className="max-w-[1200px] mx-auto p-6 md:p-8 text-base text-zinc-900 dark:text-zinc-100 space-y-6">
      {/* Top bar */}
<div className="sticky top-2 z-20 flex items-center gap-4 mb-4 shadow-md rounded-xl p-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur">
        <button
  className={topTab === "plan" ? BTN_TAB_ACTIVE : BTN_TAB}
  onClick={() => setTopTab("plan")}
>
  Plan
</button>
<button
  className={topTab === "lesson" ? BTN_TAB_ACTIVE : BTN_TAB}
  onClick={() => setTopTab("lesson")}
>
  Lesson
</button>

        <div className="ml-auto flex items-center gap-4">
          <select className="border rounded-lg px-3 py-2 shadow-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {studentList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {editingStudent ? (
            <input
              autoFocus
              className="border rounded-lg px-3 py-2 shadow-sm"
              value={studentList.find((s) => s.id === studentId)?.name || ""}
              onChange={(e) =>
                setStudentList((prev) => prev.map((s) => (s.id === studentId ? { ...s, name: e.target.value } : s)))
              }
              onBlur={() => setEditingStudent(false)}
            />
          ) : (
            <button className="px-4 py-2 rounded-lg border shadow-sm" onClick={() => setEditingStudent(true)}>
              Edit Name
            </button>
          )}
          <button
            className="px-4 py-2 rounded-lg border shadow-sm bg-green-100 text-green-800"
            onClick={() => setStudentList((prev) => [...prev, { id: uid(), name: `Student ${prev.length + 1}` }])}
          >
            + Student
          </button>
          <select className="border rounded-lg px-3 py-2 shadow-sm" value={theme} onChange={(e) => setTheme(e.target.value as "auto" | "light" | "dark")}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Plan view */}
      {topTab === "plan" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border rounded-lg p-4 shadow-md dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80">
            <div className="flex items-center gap-2 mb-2">
              <select
                className="border rounded px-2 py-1 flex-1 shadow-sm"
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setCurrentLessonIndex(0);
                }}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className={BTN_POS} onClick={addPlan}>
  + Plan
</button>

            </div>
            <div className="space-y-2">
              <input
                className="w-full border rounded px-2 py-1 bg-transparent dark:border-zinc-700 shadow-sm"
                value={plan.name}
                onChange={(e) => renamePlan(e.target.value)}
              />
              <input
                type="date"
                className="w-full border rounded px-2 py-1 bg-transparent dark:border-zinc-700 shadow-sm"
                value={plan.date}
                onChange={(e) => setPlanDate(e.target.value)}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className={BTN_POS} onClick={addLessonToPlan}>
                + Lesson
              </button>
              <button className="px-3 py-1 rounded border shadow-sm" onClick={exportPlanJSON}>
                Export Plan JSON
              </button>
            </div>
            <div className="mt-3 text-xs text-zinc-500">Lessons in plan</div>
            <div className="divide-y dark:divide-zinc-700 border rounded mt-1 dark:border-zinc-700 shadow-sm">
              {plan.lessons.map((L, i) => (
                <div
                  key={L.id}
                  className={`p-2 flex items-center gap-2 ${i === currentLessonIndex ? "bg-white/70 dark:bg-zinc-700/50" : ""}`}
                >
                  <button
                    className="underline"
                    onClick={() => {
                      setCurrentLessonIndex(i);
                      setTopTab("lesson");
                    }}
                  >
                    {L.title}
                  </button>
                  <span className="ml-auto flex items-center gap-1">
                    <button
  className={BTN}
  disabled={i === 0}
  onClick={() => moveLesson(i, "up")}
>
  ↑
</button>
                    <button
  className={BTN}
  disabled={i === plan.lessons.length - 1}
  onClick={() => moveLesson(i, "down")}
>
  ↓
</button>
                    <button
  className={BTN}
  onClick={() => duplicateLesson(i)}
>
  ⎘
</button>
                    <button
  className={BTN_NEG}
  onClick={() => removeLesson(i)}
>
  ✕
</button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 border rounded-lg p-4 shadow-md dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80">
            <div className="text-base font-semibold mb-2">Preview</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {lesson.title} — {lesson.position} {lesson.category.toLowerCase()}, ({lesson.reference})
            </div>
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              {lesson.slices.map((s, i) => (
                <li key={s.id}>
                  {s.title} <span className="text-xs text-zinc-500">({s.steps.length} steps)</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Lesson view */}
      {topTab === "lesson" && lesson && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{titleFormula}</h1>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                Class: <span className="font-medium">{lesson.id} — {lesson.title}</span> • Setup:{" "}
                <span className="font-medium">{lesson.setup}</span> • Sub-position:{" "}
                <span className="font-medium">{lesson.subPosition || "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1.5 rounded-full shadow-sm bg-position-${posKey} text-position-${posKey}-text`}>
                {lesson.position}
              </span>
              <span className="text-sm px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 shadow-sm">
                {lesson.category}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className={tab === "coach" ? BTN_TAB_ACTIVE : BTN_TAB} onClick={() => setTab("coach")}>Coach Mode</button>
<button className={tab === "report" ? BTN_TAB_ACTIVE : BTN_TAB} onClick={() => setTab("report")}>Report</button>
<button className={tab === "library" ? BTN_TAB_ACTIVE : BTN_TAB} onClick={() => setTab("library")}>Library</button>
<button className={tab === "tags" ? BTN_TAB_ACTIVE : BTN_TAB} onClick={() => setTab("tags")}>Tags</button>


            <div className="ml-auto flex items-center gap-3">
              <button className={BTN_POS} onClick={startTimer}>Start</button>
<button className={BTN} onClick={pauseTimer}>Pause</button>
<button className={BTN_NEG} onClick={finishTimer}>Finish</button>

              <div className="text-sm text-zinc-600 dark:text-zinc-400">Timer: {toClock(elapsed)}</div>
            </div>
          </div>

          {/* Coach Mode */}
          {tab === "coach" && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {lesson.slices.map((s, i) => (
                <div key={s.id} className={`rounded-xl border dark:border-zinc-700 p-4 shadow-md hover:shadow-lg transition bg-slice-bg-${(i % 6) + 1}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={!!s.checked}
                      onChange={(e) => toggleSliceDone(i, e.target.checked)}
                    />
                    <input
                      className="font-medium bg-transparent border-b border-transparent focus:border-zinc-400 outline-none flex-1"
                      value={`${s.title}`}
                      onChange={(e) => setSlice(i, { title: e.target.value })}
                    />
                    {s.timestamp && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 ml-auto">
                        {s.timestamp}
                      </span>
                    )}
                  </div>

                  {(s.indicator || s.essential || s.mistake) && (
                    <div className="text-xs space-y-1">
                      {s.indicator !== undefined && (
                        <div className="flex gap-2 items-center">
                          <b>Indicator:</b>
                          <input
                            className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none"
                            value={s.indicator}
                            onChange={(e) => setSlice(i, { indicator: e.target.value })}
                          />
                        </div>
                      )}
                      {s.essential !== undefined && (
                        <div className="flex gap-2 items-center">
                          <b>Essential:</b>
                          <input
                            className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none"
                            value={s.essential}
                            onChange={(e) => setSlice(i, { essential: e.target.value })}
                          />
                        </div>
                      )}
                      {s.mistake !== undefined && (
                        <div className="flex gap-2 items-center">
                          <b>Mistake:</b>
                          <input
                            className="flex-1 bg-transparent border-b border-transparent focus:border-zinc-400 outline-none"
                            value={s.mistake}
                            onChange={(e) => setSlice(i, { mistake: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs">Drill time:</span>
                    <span className="text-sm font-mono">
                      {toClock(s.drillRunning && s.drillStartEpoch ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000) : s.drillBaseSeconds)}
                    </span>
                    {!s.drillRunning ? (
                      <>
                        <button className="px-2 py-1 text-xs rounded border shadow-sm bg-green-100 text-green-800" onClick={() => startDrill(i)}>
                          Start
                        </button>
                        <button className="px-2 py-1 text-xs rounded border shadow-sm" onClick={() => resetDrill(i)}>
                          Reset
                        </button>
                      </>
                    ) : (
                      <button className="px-2 py-1 text-xs rounded border shadow-sm" onClick={() => pauseDrill(i)}>
                        Pause
                      </button>
                    )}
                    <label className="ml-3 text-xs">
                      GIF:
                      <input
                        type="file"
                        accept="image/gif"
                        className="ml-2 text-xs"
                        onChange={(e) => onGifChange(i, e.target.files?.[0] || null)}
                      />
                    </label>
                    {s.gifUrl && (
                      <a className="text-xs underline ml-2" href={s.gifUrl} target="_blank" rel="noreferrer">
                        Preview
                      </a>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Order of operations</div>
                    <div className="space-y-2">
                      {s.steps.map((st, j) => (
                        <div
                          key={st.id}
                          className={`rounded-lg p-2 ${st.importance === 'important' ? 'bg-importance-important-bg text-importance-important-text border-importance-important-border' : st.importance === 'critical' ? 'bg-importance-critical-bg text-importance-critical-text border-importance-critical-border' : 'border border-zinc-300 dark:border-zinc-700'} ${j % 2 === 0 ? "bg-white/80 dark:bg-white/5" : "bg-neutral-50 dark:bg-neutral-900/40"}`}
                        >
                          <div className="flex items-start gap-2 flex-wrap">
                            <input type="checkbox" checked={!!st.done} onChange={(e) => setStep(i, j, { done: e.target.checked })} />
                            <textarea
                              rows={2}
                              className="w-full bg-transparent border rounded p-1 border-zinc-200 dark:border-white/10"
                              value={st.text}
                              onChange={(e) => setStep(i, j, { text: e.target.value })}
                            />
                            <div className="flex items-center gap-2 ml-auto">
                              <button className="px-2 py-1 rounded border shadow-sm" disabled={j === 0} onClick={() => moveStep(i, j, "up")}>
                                ↑
                              </button>
                              <button
                                className="px-2 py-1 rounded border shadow-sm"
                                disabled={j === s.steps.length - 1}
                                onClick={() => moveStep(i, j, "down")}
                              >
                                ↓
                              </button>
                              <button className="px-2 py-1 rounded border shadow-sm" onClick={() => removeStep(i, j)}>
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs">Confidence:</span>
                            {(["low", "med", "high"] as const).map((lvl) => (
                              <button
                                key={lvl}
                                className={`text-xs px-2 py-1 rounded-full ${st.confidence === lvl ? `bg-feedback-${lvl}-bg text-feedback-${lvl}-text border-feedback-${lvl}-border` : "border border-zinc-300 dark:border-white/10"}`}
                                onClick={() => setStep(i, j, { confidence: st.confidence === lvl ? null : lvl })}
                              >
                                {lvl}
                              </button>
                            ))}
                            <span className="text-xs ml-3">Next class:</span>
                            {(["review", "reteach", "teach"] as const).map((opt) => (
                              <button
                                key={opt}
                                className={`text-xs px-2 py-1 rounded-full ${st.next === opt ? `bg-feedback-${opt}-bg text-feedback-${opt}-text border-feedback-${opt}-border` : "border border-zinc-300 dark:border-white/10"}`}
                                onClick={() => setStep(i, j, { next: st.next === opt ? null : opt })}
                              >
                                {opt === "review" ? "Quick review" : opt === "reteach" ? "Reteach" : "Teach"}
                              </button>
                            ))}
                            <span className="text-xs ml-3">Importance:</span>
                            {(["standard", "important", "critical"] as Importance[]).map((lvl) => (
                              <button
                                key={lvl}
                                className={`text-xs px-2 py-1 rounded ${st.importance === lvl ? `bg-importance-${lvl}-bg text-importance-${lvl}-text border-importance-${lvl}-border` : "border border-zinc-300 dark:border-white/10"}`}
                                onClick={() => setStep(i, j, { importance: lvl })}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="mt-2 text-xs px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700" onClick={() => addStep(i)}>
                      + Add step
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Slice notes</div>
                    <textarea
                      className="w-full border rounded p-2 bg-transparent border-zinc-200 dark:border-white/10"
                      value={s.notes}
                      onChange={(e) => setSlice(i, { notes: e.target.value })}
                      placeholder="Coaching notes, observations, cues…"
                    />
                  </div>
                </div>
              ))}
              <button className="col-span-full px-4 py-2 rounded-lg border shadow-sm bg-green-100 text-green-800 mt-4" onClick={addSlice}>
                + Add Slice
              </button>
            </div>
          )}

          {/* Report */}
          {tab === "report" && (
            <div className="mt-4 p-3 rounded-xl border dark:border-white/10">
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded bg-position-${posKey} text-position-${posKey}-text`}>{lesson.position}</span>
                <span className="px-2 py-0.5 rounded border border-zinc-300 dark:border-white/20">{lesson.category}</span>
                <span className="text-zinc-600 dark:text-zinc-400">{titleFormula}</span>
              </div>
              <div className="mt-3 space-y-3">
                {lesson.slices.map((s, i) => (
                  <div key={s.id} className="rounded border p-3 dark:border-white/10">
                    <div className="font-medium mb-1 flex items-center gap-2">
                      {`${i}. ${s.title}`}{" "}
                      {s.timestamp && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10">
                          {s.timestamp}
                        </span>
                      )}
                      <span className="ml-2 text-[11px] italic text-zinc-500">
                        Drill: {toClock(s.drillRunning && s.drillStartEpoch ? s.drillBaseSeconds + Math.floor((Date.now() - s.drillStartEpoch) / 1000) : s.drillBaseSeconds)}
                      </span>
                    </div>
                    {s.gifUrl && (
                      <div className="mb-2">
                        <img src={s.gifUrl} alt={`${s.title} demo`} className="max-h-40 rounded" />
                      </div>
                    )}
                    {s.notes && (
                      <div className="text-xs mb-2">
                        <b>Notes:</b> {s.notes}
                      </div>
                    )}
                    <ol className="list-decimal ml-6 space-y-1">
                      {s.steps.map((st, j) => (
                        <li key={st.id} className={`${j % 2 ? "bg-neutral-50 dark:bg-neutral-900/40" : ""} rounded-sm px-1`}>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                            <div>
                              {st.text || <span className="text-zinc-500">(empty step)</span>} {st.done ? "✅" : ""}
                              {st.importance !== "standard" && (
                                <span
                                  className={`ml-2 text-[10px] px-1.5 py-0.5 rounded bg-importance-${st.importance}-bg text-importance-${st.importance}-text`}
                                >
                                  {st.importance}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-3">
                              <span>Conf: {st.confidence || "—"}</span>
                              <span>Next: {st.next || "—"}</span>
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
            <div className="mt-4">
              <LibraryPanel
                lessonsByCourse={LIBRARIES}
                onAdd={(libraryLesson: Lesson) => {
                  const cloned = cloneLibraryLesson(libraryLesson);
                  setPlans((prev) =>
                    prev.map((p) =>
                      p.id === selectedPlanId ? { ...p, lessons: [...p.lessons, cloned] } : p
                    )
                  );
                  setTab("coach");
                }}
              />
            </div>
          )}

          {/* Tags */}
          {tab === "tags" && (
            <div className="mt-4 p-3 rounded-xl border dark:border-white/10 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Position</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.position}
                    onChange={(e) => setLessonField({ position: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Category</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.category}
                    onChange={(e) => setLessonField({ category: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Reference</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.reference}
                    onChange={(e) => setLessonField({ reference: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Setup</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.setup}
                    onChange={(e) => setLessonField({ setup: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Sub-position</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.subPosition || ""}
                    onChange={(e) => setLessonField({ subPosition: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">Lesson Title</div>
                  <input
                    className="w-full border rounded p-2 bg-transparent dark:border-white/10"
                    value={lesson.title}
                    onChange={(e) => setLessonField({ title: e.target.value })}
                  />
                </div>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Title format → <code>{`${lesson.position} ${lesson.category.toLowerCase()}, (${lesson.reference})`}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent sessions */}
      {history.length > 0 && (
        <div className="mt-8 shadow-md rounded-lg border dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80">
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 p-4">Recent sessions</div>
          <div className="rounded border dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700">
            {history
              .slice(-5)
              .reverse()
              .map((h) => (
                <div key={h.id} className="p-2 text-xs flex items-center gap-3">
                  <span className="font-medium">{studentList.find((s) => s.id === h.studentId)?.name || "Student"}</span>
                  <span>•</span>
                  <span>{h.date}</span>
                  <span>•</span>
                  <span>{h.minutes} min</span>
                  {h.nextPlan.length > 0 && (
                    <span className="ml-auto italic text-zinc-500">
                      Next: {h.nextPlan[0].sliceTitle} → {h.nextPlan[0].action}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}