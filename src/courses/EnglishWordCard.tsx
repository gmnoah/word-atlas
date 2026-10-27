import { ArrowRight } from "lucide-react";
import type { Course } from "../atlas/types";
import type { EnglishEntry } from "./types";
import type { PrimaryStartingStage } from "./starting-point";
import { PreviewSpeak } from "./PreviewSpeak";
import { exampleTargetParts } from "./example-target";

/** The picture is rendered alongside this component by the study card. */
export function EnglishWordCard({ entry, course, stage, slow, onContinue }: {
  entry: EnglishEntry;
  course: Course;
  stage: PrimaryStartingStage;
  slow: boolean;
  onContinue: () => void;
}) {
  const recording = course.audio(entry);
  const target = exampleTargetParts(entry.example.text, entry.example.targetForm);
  return (
    <div className="english-word-card">
      <h2 className="preview-headword" lang="en">{entry.word}</h2>
      <p className="preview-meaning">{entry.meaning}</p>
      {recording ? (
        <PreviewSpeak text={entry.word} locale={entry.media.locale} recording={recording} slow={slow} />
      ) : (
        <p className="english-word-card-missing" role="status">暂时没有单词录音，可以请家长读一读。</p>
      )}
      <details className="english-word-card-details" open={stage === "advanced" || undefined}>
        <summary>看看例句 <span aria-hidden="true">＋</span></summary>
        <div className="preview-example">
          <p lang="en">{target ? <>{target[0]}<mark className="example-target">{target[1]}</mark>{target[2]}</> : entry.example.text}</p>
          <span>{entry.example.translation}</span>
        </div>
      </details>
      <button className="btn btn-primary btn-xl" onClick={onContinue}>
        认识了，继续 <ArrowRight size={20} />
      </button>
    </div>
  );
}
