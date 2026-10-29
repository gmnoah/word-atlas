import { ArrowRight, BookOpen, Compass, Leaf } from "lucide-react";
import { Illustration } from "../ui/Illustration";
import { useMemo } from "react";
import type { Course } from "../atlas/types";
import type { journeyProgress } from "./journey-progress";
import { entryLabel, type HanziEntry, type LearningEntry, type Lesson } from "./types";

/**
 * A flat theme map for preschoolers: large stops, no 3D, no scores.
 * It deliberately shows fewer labels than the primary course page.
 */
export function HanziMap({ course, lessons, entries, exploration, onOpenEntry, onStart, onCoRead }: {
  course: Course;
  lessons: Lesson[];
  entries: LearningEntry[];
  exploration: ReturnType<typeof journeyProgress> | null;
  onOpenEntry: (entry: HanziEntry) => void;
  onStart: (lesson: Lesson) => void;
  onCoRead: (lesson: Lesson) => void;
}) {
  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  return (
    <section className="hanzi-map" aria-labelledby="hanzi-map-title">
      <div className="hanzi-map-head">
        <div>
          <p className="eyebrow">LITTLE EXPLORATIONS</p>
          <h2 id="hanzi-map-title">今天想去哪里看看字？</h2>
          <p>选一个地方，和家长一起读一读。随时可以停下。</p>
        </div>
        <Compass size={30} strokeWidth={1.2} aria-hidden="true" />
      </div>
      <ol className="hanzi-map-path">
        {lessons.map((lesson, index) => {
          const lessonEntries = lesson.entryIds
            .map((id) => entriesById.get(id))
            .filter((entry): entry is HanziEntry => !!entry && entry.kind === "hanzi");
          const first = lessonEntries[0];
          return (
            <li key={lesson.id} className="hanzi-map-stop">
              <span className="hanzi-map-index" aria-hidden="true">
                {index + 1}
              </span>
              {first && (
                <div className="hanzi-map-art">
                  <Illustration src={course.img(first)} word={first.character} />
                </div>
              )}
              <div className="hanzi-map-body">
                <h3>{lesson.title}</h3>
                {exploration && <p>{exploration.themes[index]?.state === "visited" ? "这一站都看过了" : exploration.themes[index]?.state === "partial" ? "来过这里" : "等你来探索"}</p>}
                <p>{lesson.subtitle}</p>
                <p className="hanzi-map-chars" aria-label="这一站的字">
                  {lessonEntries.map((entry) => (
                    <button type="button" key={entry.id} className="hanzi-entry-link" onClick={() => onOpenEntry(entry)} aria-label={`查看${entry.character}字卡`}><span lang="zh-CN">{entryLabel(entry)}</span></button>
                  ))}
                </p>
                <div className="hanzi-map-actions">
                  <button className="btn btn-primary btn-xl" onClick={() => onStart(lesson)}>
                    <BookOpen size={20} /> 认一认
                  </button>
                  <button className="btn btn-ghost" onClick={() => onCoRead(lesson)}>
                    只读一读
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="hanzi-map-note">
        <Leaf size={18} aria-hidden="true" />
        不认识也没关系，共读不算成绩。拼音只在家长提示里出现。
        <ArrowRight size={16} aria-hidden="true" />
      </p>
    </section>
  );
}
