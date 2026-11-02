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
export function HanziMap({ course, lessons, entries, exploration, matchingEntryIds, checkpointStatus, onOpenEntry, onStart, onCoRead, onOpenSettings }: {
  course: Course;
  lessons: Lesson[];
  entries: LearningEntry[];
  exploration: ReturnType<typeof journeyProgress> | null;
  matchingEntryIds: ReadonlySet<string>;
  checkpointStatus: (lesson: Lesson, mode: "lesson" | "co-read", entries: HanziEntry[]) => "empty" | "active" | "finished" | "invalid";
  onOpenEntry: (entry: HanziEntry) => void;
  onStart: (lesson: Lesson) => void;
  onCoRead: (lesson: Lesson) => void;
  onOpenSettings?: () => void;
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
        {lessons.map((lesson) => {
          const index = (course.lessons ?? []).findIndex((item) => item.id === lesson.id);
          const theme = exploration?.themes.find((item) => item.id === lesson.id);
          const lessonEntries = lesson.entryIds
            .map((id) => entriesById.get(id))
            .filter((entry): entry is HanziEntry => !!entry && entry.kind === "hanzi");
          const first = lessonEntries[0];
          const recognition = checkpointStatus(lesson, "lesson", lessonEntries);
          const reading = checkpointStatus(lesson, "co-read", lessonEntries);
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
                {theme && <p>{theme.state === "visited" ? "这一站都看过了" : theme.state === "partial" ? "来过这里" : "等你来探索"}</p>}
                <p>{lesson.subtitle}</p>
                <p className="hanzi-map-chars" aria-label="这一站的字">
                  {lessonEntries.map((entry) => (
                    <button type="button" key={entry.id} className={`hanzi-entry-link${matchingEntryIds.has(entry.id) ? " is-search-match" : ""}`} onClick={() => onOpenEntry(entry)} aria-label={`查看${entry.character}字卡${matchingEntryIds.has(entry.id) ? "，符合查找" : ""}`}><span lang="zh-CN">{entryLabel(entry)}</span></button>
                  ))}
                </p>
                <div className="hanzi-map-actions">
                  <button className="btn btn-primary btn-xl" disabled={recognition === "invalid"} onClick={() => onStart(lesson)}>
                    <BookOpen size={20} /> {recognition === "invalid" ? "认读记录待恢复" : recognition === "active" ? "继续认一认" : recognition === "finished" ? "查看认读结果" : "认一认"}
                  </button>
                  <button className="btn btn-ghost" disabled={reading === "invalid"} onClick={() => onCoRead(lesson)}>
                    {reading === "invalid" ? "共读记录待恢复" : reading === "active" ? "继续共读" : reading === "finished" ? "查看共读结果" : "只读一读"}
                  </button>
                </div>
                {(recognition === "invalid" || reading === "invalid") && <div className="journey-action-error" role="status">
                  <span>{recognition === "invalid" && reading === "invalid" ? "认读和共读" : recognition === "invalid" ? "认读" : "共读"}记录暂时无法读取，原记录已保留。可以选择其他活动或主题。</span>
                  {onOpenSettings && <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>打开家长设置</button>}
                </div>}
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
