import { ArrowRight } from "lucide-react";
import type { Course } from "../atlas/types";
import type { HanziEntry } from "./types";
import { PreviewSpeak } from "./PreviewSpeak";

/**
 * A preschool character card: one large character, one picture, one phrase.
 * Pinyin stays inside the caregiver note so it never becomes a reading test.
 */
export function HanziCard({ entry, course, slow, coRead, onContinue }: {
  entry: HanziEntry;
  course: Course;
  slow: boolean;
  coRead: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="hanzi-card">
      <h2 className="hanzi-card-character" lang="zh-CN">
        {entry.character}
      </h2>
      <p className="hanzi-card-phrase">{entry.phrase}</p>
      <PreviewSpeak
        text={entry.character}
        locale="zh-CN"
        recording={course.audio(entry)}
        slow={slow}
        accessibleLabel={`朗读汉字 ${entry.character}`}
      />
      <p className="hanzi-card-sentence">{entry.sentence}</p>
      <details className="hanzi-card-note">
        <summary>给家长的小提示</summary>
        <p>
          <b>{entry.pinyin}</b> · {entry.caregiverTip}
        </p>
        <small>拼音只在家长提示里出现；孩子不需要会拼音，也不需要写字。</small>
      </details>
      <button className="btn btn-primary btn-xl hanzi-continue" onClick={onContinue}>
        {coRead ? "看过啦，下一个" : "认识了，继续"} <ArrowRight size={20} />
      </button>
    </div>
  );
}
