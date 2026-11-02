import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, ArrowRight, ChevronRight } from "lucide-react";
import { primaryReviewIds, readPrimaryProgress, togglePrimaryFavorite, withPrimaryLock, writePrimaryProgress, type PrimaryProgress } from "../learning/primary-progress";
import { entryLabel, type LearningEntry } from "./types";
import { readCheckpoint } from "./primary-checkpoint";

type PrimaryProgressStatus = "loading" | "ready" | "read-error" | "write-error";

function usePrimaryProgress(profileId: string, courseId: string) {
  const scope = `${profileId}:${courseId}`;
  const [state, setState] = useState<{ scope: string; status: PrimaryProgressStatus; progress: PrimaryProgress | null }>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const result = readPrimaryProgress(localStorage, profileId, courseId);
        return {
          scope,
          status: result.ok ? "ready" : "read-error",
          progress: result.ok ? result.progress : null,
        };
      }
    } catch {}
    return { scope, status: "loading", progress: null };
  });
  const refresh = useCallback(() => {
    const result = readPrimaryProgress(localStorage, profileId, courseId);
    setState({
      scope: `${profileId}:${courseId}`,
      status: result.ok ? "ready" : "read-error",
      progress: result.ok ? result.progress : null,
    });
  }, [profileId, courseId]);
  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("primary-progress-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("primary-progress-changed", refresh); };
  }, [refresh]);
  const toggle = async (id: string) => {
    try {
      const result = await withPrimaryLock(profileId, courseId, () => {
        const current = readPrimaryProgress(localStorage, profileId, courseId);
        if (!current.ok) return "read-error" as const;
        return writePrimaryProgress(localStorage, togglePrimaryFavorite(current.progress, id)) ? "saved" as const : "write-error" as const;
      });
      if (result === "read-error") {
        setState({ scope, status: "read-error", progress: null });
        return false;
      }
      if (result === "write-error") {
        setState((current) => ({ ...current, scope, status: "write-error" }));
        return false;
      }
      window.dispatchEvent(new Event("primary-progress-changed"));
      return true;
    } catch {
      setState((current) => ({ ...current, scope, status: "write-error" }));
      return false;
    }
  };
  const current = state.scope === scope ? state : { scope, status: "loading" as const, progress: null };
  const progress = current.progress?.profileId === profileId && current.progress.courseId === courseId ? current.progress : null;
  return {
    progress,
    loading: current.status === "loading",
    readError: current.status === "read-error",
    writeError: current.status === "write-error",
    toggle,
  };
}

function FavoriteList({ entries, unit, onOpen, onRemove, emptyText }: {
  entries: LearningEntry[];
  unit: "词" | "字";
  onOpen: (entry: LearningEntry) => void;
  onRemove: (id: string) => Promise<boolean>;
  emptyText: string;
}) {
  const openRefs = useRef(new Map<string, HTMLButtonElement>());
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [focusAfterRemoval, setFocusAfterRemoval] = useState<{ removedId: string; nextId?: string } | null>(null);

  useEffect(() => {
    if (!focusAfterRemoval || entries.some((entry) => entry.id === focusAfterRemoval.removedId)) return;
    if (focusAfterRemoval.nextId) openRefs.current.get(focusAfterRemoval.nextId)?.focus({ preventScroll: true });
    else emptyRef.current?.focus({ preventScroll: true });
    setFocusAfterRemoval(null);
  }, [entries, focusAfterRemoval]);

  const remove = async (entry: LearningEntry) => {
    const index = entries.findIndex((item) => item.id === entry.id);
    const next = entries[index + 1] ?? entries[index - 1];
    setRemovingId(entry.id);
    const removed = await onRemove(entry.id);
    setRemovingId(null);
    if (!removed) return;
    setFocusAfterRemoval({ removedId: entry.id, nextId: next?.id });
  };

  if (!entries.length) return <p ref={emptyRef} className="primary-favorites-empty" role="status" tabIndex={-1}>{emptyText}</p>;
  return <ul>{entries.map((entry) => <li key={entry.id}>
    <button ref={(node) => {
      if (node) openRefs.current.set(entry.id, node);
      else openRefs.current.delete(entry.id);
    }} type="button" className="primary-favorite-open" aria-label={`打开 ${entryLabel(entry)} ${unit}卡`} onClick={() => onOpen(entry)}>
      <span>{entryLabel(entry)}{entry.kind === "english" ? ` · ${entry.meaning}` : ` · ${entry.phrase}`}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
    <button type="button" className="btn btn-ghost" disabled={removingId === entry.id}
      aria-label={`取消收藏 ${entryLabel(entry)}`} aria-busy={removingId === entry.id} onClick={() => void remove(entry)}>取消收藏</button>
  </li>)}</ul>;
}

export function PrimaryFavorite({ profileId, courseId, entry, onOpenSettings }: {
  profileId: string;
  courseId: string;
  entry: LearningEntry;
  onOpenSettings?: () => void;
}) {
  const { progress, loading, readError, writeError, toggle } = usePrimaryProgress(profileId, courseId);
  const favorite = progress?.favorites.includes(entry.id) ?? false;
  return <div className="primary-favorite"><button type="button" className="btn btn-ghost" disabled={loading || readError} aria-busy={loading} aria-pressed={favorite} onClick={() => void toggle(entry.id)}>
    <Heart size={18} fill={favorite ? "currentColor" : "none"} />{favorite ? "已收藏" : entry.kind === "hanzi" ? "收藏这个字" : "收藏这个词"}
  </button>
    {loading && <p role="status">正在读取收藏记录…</p>}
    {readError && <div className="primary-favorite-error" role="alert">
      <span>收藏记录暂时无法读取，原记录已保留。</span>
      {onOpenSettings && <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>打开家长设置</button>}
    </div>}
    {writeError && <div className="primary-favorite-error" role="alert">
      <span>收藏暂时无法保存，原记录已保留。</span>
      <button type="button" className="btn btn-ghost" onClick={() => void toggle(entry.id)}>再试一次</button>
    </div>}
  </div>;
}

export function PrimaryFavoriteOverview({ profileId, courseId, entries, unit, onOpenEntry, onOpenSettings }: {
  profileId: string;
  courseId: string;
  entries: LearningEntry[];
  unit: "词" | "字";
  onOpenEntry: (entry: LearningEntry) => void;
  onOpenSettings?: () => void;
}) {
  const { progress, loading, readError, writeError, toggle } = usePrimaryProgress(profileId, courseId);
  const favorites = progress ? entries.filter((entry) => progress.favorites.includes(entry.id)) : [];
  return <section className="panel primary-journey primary-favorite-overview" aria-label={`收藏的${unit}`}>
    <div>
      <p className="eyebrow">SAVED {unit === "字" ? "CHARACTERS" : "WORDS"}</p>
      <h2>收藏的{unit}</h2>
      <p>从图鉴或小课里收藏，之后可以在这里再打开看看。</p>
    </div>
    <div className="primary-favorites">
      {loading ? <p className="primary-favorites-empty" role="status">正在读取收藏记录…</p>
        : readError ? <div className="primary-favorites-empty primary-favorites-recovery" role="alert">
          <p>收藏记录暂时无法读取，原记录已保留。</p>
          {onOpenSettings && <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>打开家长设置</button>}
        </div>
          : <FavoriteList entries={favorites} unit={unit} onOpen={onOpenEntry} onRemove={toggle}
            emptyText={`还没有收藏的${unit}。在词字卡里遇到喜欢的内容时，点一下收藏。`} />}
    </div>
    {writeError && <div className="primary-journey-error" role="alert"><span>收藏暂时无法保存，原记录已保留。</span></div>}
  </section>;
}

type TodayProps = {
  profileId: string;
  courseId: string;
  contentVersion: string;
  entries: LearningEntry[];
  onToday: () => void;
  onOpenSettings?: () => void;
};

function todayState({ profileId, courseId, contentVersion, entries }: TodayProps, progress: PrimaryProgress | null, status: PrimaryProgressStatus) {
  const known = new Set(entries.map((entry) => entry.id));
  const due = progress ? primaryReviewIds(progress, Date.now()).filter((id) => known.has(id)) : [];
  const fresh = progress ? entries.filter((entry) => !Object.hasOwn(progress.introduced, entry.id) && !progress.cards[entry.id]) : [];
  const checkpoint = readCheckpoint(localStorage, { profileId, courseId, lessonId: "today", contentVersion, entries }, Date.now());
  const hasCheckpoint = checkpoint.status === "ok" && !checkpoint.checkpoint.session.endReason;
  const hasFinishedCheckpoint = checkpoint.status === "ok" && !!checkpoint.checkpoint.session.endReason;
  const actionLabel = status === "loading"
    ? "正在读取学习记录"
    : status === "read-error"
      ? "学习记录待恢复"
      : checkpoint.status === "invalid"
        ? "小课记录待恢复"
        : hasCheckpoint
          ? "继续今日小课"
          : hasFinishedCheckpoint
            ? "查看上次小课"
            : "开始今日小课";
  const description = status === "loading" ? "正在读取学习记录…" : status === "read-error" ? "学习记录暂时无法读取。" : checkpoint.status === "invalid" ? "今日小课记录暂时无法读取，可以先选择其他主题。" : hasCheckpoint ? "上次的小课还在这里，随时接着学习。" : hasFinishedCheckpoint ? "上次的小课还在这里，可以查看结果。" : due.length ? "先回顾认识过的词，再发现新朋友。" : fresh.length ? "从一个小小的发现开始。" : "今天先休息，之后再回来看看。";
  return { checkpoint, actionLabel, description, disabled: !progress || checkpoint.status === "invalid" || (!due.length && !fresh.length && !hasCheckpoint && !hasFinishedCheckpoint) };
}

/** The hero and the atlas use the same validated checkpoint rules. */
export function PrimaryTodayButton(props: TodayProps) {
  const { progress, loading, readError } = usePrimaryProgress(props.profileId, props.courseId);
  const today = todayState(props, progress, loading ? "loading" : readError ? "read-error" : "ready");
  return <><button className="btn btn-primary btn-xl" disabled={today.disabled} onClick={props.onToday}>{today.actionLabel} <ArrowRight size={18} /></button>
    {readError ? <div className="journey-action-error journey-progress-recovery" role="status"><span>学习进度暂时无法读取，原记录已保留。</span>
      {props.onOpenSettings && <button type="button" className="btn btn-glass" onClick={props.onOpenSettings}>打开家长设置</button>}</div>
      : today.checkpoint.status === "invalid" && <div className="journey-action-error" role="status"><span>今日小课记录暂时无法读取，原记录已保留。可以选择其他主题。</span>
        {props.onOpenSettings && <button type="button" className="btn btn-glass" onClick={props.onOpenSettings}>打开家长设置</button>}</div>}</>;
}

export function PrimaryJourney(props: TodayProps & { hideAction?: boolean; onOpenFavorite: (entry: LearningEntry) => void }) {
  const { profileId, courseId, entries, onToday, onOpenSettings, hideAction = false, onOpenFavorite } = props;
  const { progress, loading, readError, writeError, toggle } = usePrimaryProgress(profileId, courseId);
  const favorites = progress ? entries.filter((entry) => progress.favorites.includes(entry.id)) : [];
  const today = todayState(props, progress, loading ? "loading" : readError ? "read-error" : "ready");
  return <section className="panel primary-journey" aria-label="今日学习">
    <div><p className="eyebrow">TODAY / 今日小课</p><h2>今天一起看看什么？</h2>
      <p>{today.description}</p>
      {!hideAction && <button className="btn btn-primary" disabled={today.disabled} onClick={onToday}>{today.actionLabel} <ArrowRight size={18} /></button>}
    </div>
    <div className="primary-favorites"><h3>收藏的词{favorites.length > 0 && <span className="primary-favorites-count">{favorites.length}</span>}</h3>
      {loading ? <p className="primary-favorites-empty" role="status">正在读取收藏记录…</p>
        : readError ? <p className="primary-favorites-empty" role="alert">收藏记录暂时无法读取，原记录已保留。</p>
          : <FavoriteList entries={favorites} unit="词" onOpen={onOpenFavorite} onRemove={toggle}
            emptyText="遇到喜欢的词，可以在词卡上收藏。" />}
    </div>
    {writeError && <div className="primary-journey-error" role="alert">
      <span>收藏暂时无法保存，原记录已保留。</span>
    </div>}
    {readError && !hideAction && <div className="primary-journey-error" role="alert">
      <span>学习进度暂时无法读取，原记录已保留。</span>
      {onOpenSettings && <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>打开家长设置</button>}
    </div>}
  </section>;
}
