import { useId } from "react";
import type { Course } from "../atlas/types";
import { Illustration } from "../ui/Illustration";
import { entryLabel, type LearningEntry } from "./types";

export function LessonRecap({
  course,
  entries,
  subtitle,
}: {
  course: Course;
  entries: LearningEntry[];
  subtitle: string;
}) {
  const titleId = useId();
  if (entries.length === 0) return null;

  const hanzi = entries[0]?.kind === "hanzi";
  return (
    <section
      className={`lesson-recap${hanzi ? " is-hanzi" : ""}`}
      aria-labelledby={titleId}
    >
      <div className="lesson-recap-head">
        <div>
          <p className="eyebrow">{hanzi ? "CHARACTERS WE MET" : "WORDS WE MET"}</p>
          <h2 id={titleId}>本次遇见</h2>
        </div>
        <p>
          {entries.length} 个{hanzi ? "字" : "词"}
          <small>{subtitle}</small>
        </p>
      </div>
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-content-id={entry.id}
            className={entry.kind === "hanzi" ? "is-hanzi" : undefined}
          >
            <Illustration
              src={course.img(entry, "thumb")}
              word={entryLabel(entry)}
              eager
            />
            <div>
              <strong lang={entry.kind === "english" ? "en" : "zh-CN"}>
                {entryLabel(entry)}
              </strong>
              <span>{entry.kind === "english" ? entry.meaning : entry.phrase}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
