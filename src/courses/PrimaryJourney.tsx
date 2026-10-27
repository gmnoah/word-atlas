import { useCallback, useEffect, useState } from "react";
import { Heart, ArrowRight } from "lucide-react";
import { primaryReviewIds, readPrimaryProgress, togglePrimaryFavorite, withPrimaryLock, writePrimaryProgress, type PrimaryProgress } from "../learning/primary-progress";
import { entryLabel, type LearningEntry } from "./types";
import { checkpointKey } from "./primary-checkpoint";

function usePrimaryProgress(profileId: string, courseId: string) {
  const [progress, setProgress] = useState<PrimaryProgress | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    const result = readPrimaryProgress(localStorage, profileId, courseId);
    setProgress(result.ok ? result.progress : null);
    setError(!result.ok);
  }, [profileId, courseId]);
  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("primary-progress-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("primary-progress-changed", refresh); };
  }, [refresh]);
  const toggle = async (id: string) => {
    try {
      const ok = await withPrimaryLock(profileId, courseId, () => {
        const current = readPrimaryProgress(localStorage, profileId, courseId);
        return current.ok && writePrimaryProgress(localStorage, togglePrimaryFavorite(current.progress, id));
      });
      if (!ok) { setError(true); return; }
      window.dispatchEvent(new Event("primary-progress-changed"));
    } catch { setError(true); }
  };
  return { progress, error, toggle };
}

export function PrimaryFavorite({ profileId, courseId, entry }: { profileId: string; courseId: string; entry: LearningEntry }) {
  const { progress, error, toggle } = usePrimaryProgress(profileId, courseId);
  const favorite = progress?.favorites.includes(entry.id) ?? false;
  return <div><button type="button" className="btn btn-ghost" aria-pressed={favorite} onClick={() => void toggle(entry.id)}>
    <Heart size={18} fill={favorite ? "currentColor" : "none"} />{favorite ? "已收藏" : "收藏这个词"}
  </button>{error && <p role="alert">收藏暂时无法保存，请稍后再试。</p>}</div>;
}

export function PrimaryJourney({ profileId, courseId, entries, onToday }: { profileId: string; courseId: string; entries: LearningEntry[]; onToday: () => void }) {
  const { progress, error, toggle } = usePrimaryProgress(profileId, courseId);
  const known = new Set(entries.map((entry) => entry.id));
  const due = progress ? primaryReviewIds(progress, Date.now()).filter((id) => known.has(id)) : [];
  const fresh = progress ? entries.filter((entry) => !Object.hasOwn(progress.introduced, entry.id) && !progress.cards[entry.id]) : [];
  const favorites = progress ? entries.filter((entry) => progress.favorites.includes(entry.id)) : [];
  let hasCheckpoint = false;
  try { hasCheckpoint = localStorage.getItem(checkpointKey(profileId, courseId, "today")) !== null; } catch { /* report through progress status */ }
  return <section className="panel primary-journey" aria-label="今日学习">
    <div><p className="eyebrow">TODAY / 今日小课</p><h2>今天一起看看什么？</h2>
      <p>{due.length ? "先回顾认识过的词，再发现新朋友。" : fresh.length ? "从一个小小的发现开始。" : "今天先休息，之后再回来看看。"}</p>
      <button className="btn btn-primary" disabled={!progress || (!due.length && !fresh.length && !hasCheckpoint)} onClick={onToday}>{hasCheckpoint ? "继续今日小课" : "开始今日小课"} <ArrowRight size={18} /></button>
    </div>
    <div className="primary-favorites"><h3>收藏的词</h3>
      {favorites.length ? <ul>{favorites.map((entry) => <li key={entry.id}><span>{entryLabel(entry)}{entry.kind === "english" ? ` · ${entry.meaning}` : ""}</span>
        <button className="btn btn-ghost" onClick={() => void toggle(entry.id)} aria-label={`取消收藏 ${entryLabel(entry)}`}>取消收藏</button></li>)}</ul> : <p>遇到喜欢的词，可以在词卡上收藏。</p>}
    </div>
    {error && <p role="alert">学习记录暂时无法读取或保存，原记录已保留。</p>}
  </section>;
}
