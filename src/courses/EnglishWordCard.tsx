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
  const exampleRecording = course.audio(entry, "example");
  const target = exampleTargetParts(entry.example.text, entry.example.targetForm);
  const isMiddle = course.manifest.stage === "middle";

  return (
    <div className="english-word-card">
      <h2 className="preview-headword" lang="en">{entry.word}</h2>
      <p className="preview-meaning">
        {entry.partOfSpeech && <span className="preview-pos">{entry.partOfSpeech}</span>}
        {entry.lessonMeaning || entry.meaning}
      </p>
      {entry.collocation && (
        <div className="preview-collocation">
          <span className="preview-collocation-label">常用搭配</span>
          <span className="preview-collocation-phrase" lang="en">{entry.collocation.phrase}</span>
          <span className="preview-collocation-trans">{entry.collocation.translation}</span>
        </div>
      )}
      {recording ? (
        <PreviewSpeak text={entry.word} locale={entry.media.locale} recording={recording} slow={slow} />
      ) : (
        <p className="english-word-card-missing" role="status">暂时没有单词发音，可以查阅词典。</p>
      )}
      <details className="english-word-card-details" open={isMiddle || stage === "advanced" || undefined}>
        <summary>{isMiddle ? "情境例句" : "看看例句"} <span aria-hidden="true">＋</span></summary>
        <div className="preview-example">
          <p lang="en">{target ? <>{target[0]}<mark className="example-target">{target[1]}</mark>{target[2]}</> : entry.example.text}</p>
          <span>{entry.example.translation}</span>
        </div>
        {exampleRecording && (
          <PreviewSpeak
            key={`${entry.id}:example`}
            className="preview-example-voice"
            text={entry.example.text}
            locale={entry.media.locale}
            recording={exampleRecording}
            slow={slow}
            idleLabel="听例句"
            accessibleLabel={`朗读例句 ${entry.example.text}`}
          />
        )}
      </details>
      <button className="btn btn-primary btn-xl" onClick={onContinue}>
        {isMiddle ? "进入练习" : "认识了，继续"} <ArrowRight size={20} />
      </button>
    </div>
  );
}
