import { ArrowRight, BookOpen, Compass, Leaf } from "lucide-react";
import { Illustration } from "../ui/Illustration";
import type { Course } from "../atlas/types";
import { entryLabel, type HanziEntry, type LearningEntry, type Lesson } from "./types";

/**
 * A flat theme map for preschoolers: four large stops, no 3D, no scores.
 * It deliberately shows fewer labels than the primary course page.
 */
export function HanziMap({ course, lessons, entries, onStart, onCoRead }: {
  course: Course;
  lessons: Lesson[];
  entries: LearningEntry[];
  onStart: (lesson: Lesson) => void;
  onCoRead: (lesson: Lesson) => void;
}) {
  return (
    <section className="hanzi-map" aria-labelledby="hanzi-map-title">
      <div className="hanzi-map-head">
        <div>
          <p className="eyebrow">FOUR SMALL STOPS</p>
          <h2 id="hanzi-map-title">今天想去哪里看看字？</h2>
          <p>选一个地方，和家长一起读一读。随时可以停下。</p>
        </div>
        <Compass size={30} strokeWidth={1.2} aria-hidden="true" />
      </div>
      <ol className="hanzi-map-path">
        {lessons.map((lesson, index) => {
          const lessonEntries = lesson.entryIds
            .map((id) => entries.find((entry) => entry.id === id))
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
                <p>{lesson.subtitle}</p>
                <p className="hanzi-map-chars" aria-label="这一站的字">
                  {lessonEntries.map((entry) => (
                    <span key={entry.id} lang="zh-CN">
                      {entryLabel(entry)}
                    </span>
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
