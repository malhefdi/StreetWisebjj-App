import React, { useMemo, useState } from "react";

type Lesson = any;
type LessonsByCourse = Record<string, Lesson[]>;

export default function LibraryPanel({
  lessonsByCourse,
  onAdd,
}: {
  lessonsByCourse: LessonsByCourse;
  onAdd: (lessonFromLibrary: Lesson) => void;
}) {
  // pick the first available course by default
  const [course, setCourse] = useState<keyof LessonsByCourse>(
    Object.keys(lessonsByCourse)[0] as keyof LessonsByCourse
  );

  // the lessons for the selected course
  const courseLessons = useMemo(
    () => lessonsByCourse[course] || [],
    [lessonsByCourse, course]
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-slate-600">Course:</label>
        <select
          className="border rounded-xl px-2 py-1.5"
          value={course as string}
          onChange={(e) => setCourse(e.target.value as keyof LessonsByCourse)}
        >
          {Object.keys(lessonsByCourse).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Lesson list */}
      <div className="space-y-3">
        {courseLessons.map((L: any) => (
          <div key={L.id} className="border rounded-2xl p-4 bg-white">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{L.title}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full border text-[11px]">
                    {L.position || "TBD"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border text-[11px]">
                    {L.category || "General"}
                  </span>
                  <div className="text-[12px] opacity-70 truncate">
                    {L.reference || ""}
                  </div>
                </div>
              </div>

              <button
                className="ml-auto px-3 py-1.5 rounded-xl border bg-indigo-50 border-indigo-300"
                onClick={() => onAdd(L)}
                aria-label="Add lesson to current plan"
              >
                ➕ Add to plan
              </button>
            </div>

            {/* Slice preview (first 3 slices, first 3 steps each) */}
            {!!L?.slices?.length && (
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {(L.slices as any[]).slice(0, 3).map((s, i) => (
                  <div key={s.id ?? i} className="rounded-xl border p-3 bg-white/80">
                    <div className="text-sm font-medium mb-1 truncate">{s.title}</div>
                    {Array.isArray(s.steps) && s.steps.length ? (
                      <ul className="list-disc ml-5 text-sm space-y-0.5">
                        {s.steps.slice(0, 3).map((st: any, j: number) => (
                          <li key={st.id ?? j} className="truncate">
                            {st.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-500">No steps yet</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
