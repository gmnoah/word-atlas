import { saveSessionActivity } from "../learning/activity-record";
import { ArrowLeft, ArrowRight, Check, Leaf } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Course } from "../atlas/types";
import { createLearningSession, currentStep, learningReducer, learningSessionStats, type LearningAction } from "../learning/session";
import { Illustration } from "../ui/Illustration";
import { Sheet } from "../ui/Sheet";
import { EnglishWordCard } from "./EnglishWordCard";
import { PreviewSpeak } from "./PreviewSpeak";
import { primaryVisualPolicy, type PrimaryStartingStage } from "./starting-point";
import { entryLabel, type LearningEntry, type Lesson } from "./types";
import { clearCheckpoint, readCheckpoint, saveCheckpoint } from "./primary-checkpoint";
import { applyPrimarySession, primaryReviewIds, readPrimaryProgress, readRestoreGeneration, withPrimaryLock, writePrimaryProgress } from "../learning/primary-progress";
import { PrimaryFavorite } from "./PrimaryJourney";

export function PrimaryLesson({ course, lesson, entries, profileId, stage, spellingEnabled, count, slow, onExit, onRestart }: {
  course: Course;
  lesson: Lesson;
  entries: LearningEntry[];
  profileId: string;
  stage: PrimaryStartingStage;
  spellingEnabled: boolean;
  count: number;
  slow: boolean;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [loaded] = useState(() => readCheckpoint(localStorage, { profileId, courseId: course.manifest.id,
    lessonId: lesson.id, contentVersion: course.manifest.version, entries }, Date.now()));
  const expected = useRef<string | null>(loaded.raw);
  const generation = useRef(readRestoreGeneration(localStorage));
  const blocked = useRef(loaded.status === "invalid");
  const progressFailure = useRef(false);
  const [saveError, setSaveError] = useState(loaded.status === "invalid");
  const [progressError, setProgressError] = useState(false);
  const [sessionStage] = useState(loaded.status === "ok" ? loaded.checkpoint.stage : stage);
  const [sessionSpelling] = useState(loaded.status === "ok" ? loaded.checkpoint.spellingEnabled : spellingEnabled);
  const [session, dispatchRaw] = useReducer(learningReducer, undefined, () => {
    if (loaded.status === "ok") return loaded.checkpoint.session;
    const now = Date.now();
    const savedProgress = readPrimaryProgress(localStorage, profileId, course.manifest.id);
    const progress = savedProgress.ok ? savedProgress.progress : null;
    const today = lesson.id === "today";
    const dueIds = today && progress ? primaryReviewIds(progress, now) : [];
    const created = createLearningSession({
      courseId: course.manifest.id,
      contentVersion: course.manifest.version,
      policy: primaryVisualPolicy(sessionStage, sessionSpelling),
      pool: entries,
      due: entries.filter((entry) => dueIds.includes(entry.id)).sort((a, b) => dueIds.indexOf(a.id) - dueIds.indexOf(b.id)),
      fresh: today && progress ? entries.filter((entry) => !Object.hasOwn(progress.introduced, entry.id) && !progress.cards[entry.id]) : entries,
      requestedNewCount: count,
      now,
      seed: now,
      visible: document.visibilityState === "visible",
    });
    created.id = `learn-${globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`}`;
    return created;
  });
  const [exitOpen, setExitOpen] = useState(false);
  const [failedImageStep, setFailedImageStep] = useState<number | null>(null);
  const [audioPlayback, setAudioPlayback] = useState<{
    index: number;
    state: "waiting" | "playing" | "ready" | "error";
  } | null>(null);
  const [spellingInput, setSpellingInput] = useState<{ index: number; value: string } | null>(null);
  const closeExit = useCallback(() => setExitOpen(false), []);
  const dispatch = (action: Omit<LearningAction, "at"> & { at?: number }) =>
    dispatchRaw({ ...action, at: action.at ?? Date.now() } as LearningAction);
  const step = currentStep(session);
  const entry = entries.find((item) => item.id === step?.contentId);
  const result = step?.retry
    ? session.practice.filter((item) => item.contentId === step.contentId).at(-1)?.result
    : entry ? session.attempts[entry.id]?.result : undefined;
  const answered = !!step && !!session.answeredSteps[session.index];
  const stats = learningSessionStats(session);
  const intro = step?.kind === "intro";
  const audioQuestion = step?.kind === "listen-picture" || step?.kind === "listen-word";
  const spellQuestion = step?.kind === "spell";
  const spellingValue = spellingInput?.index === session.index ? spellingInput.value : "";
  const imageQuestion = step?.kind === "picture-word" || step?.kind === "listen-picture";
  const failedImage = failedImageStep === session.index;
  const audioState = audioPlayback?.index === session.index ? audioPlayback.state : "waiting";
  const imageMissing = (intro || imageQuestion) && (!entry?.media.image || failedImage);
  const resourceFailed = !!imageMissing || (audioQuestion && audioState === "error");
  const unableToAnswer = !!resourceFailed || (audioQuestion && audioState !== "ready");

  useEffect(() => {
    if (saveError) return;
    void withPrimaryLock(profileId, course.manifest.id, () => {
      if (blocked.current) return;
      const raw = saveCheckpoint(localStorage, { version: 1, profileId, courseId: course.manifest.id,
        lessonId: lesson.id, stage: sessionStage, spellingEnabled: sessionSpelling, session }, expected.current);
      if (raw === null) { blocked.current = true; setSaveError(true); return; }
      expected.current = raw;
      const stored = readPrimaryProgress(localStorage, profileId, course.manifest.id);
      if (!stored.ok) { progressFailure.current = true; setProgressError(true); return; }
      try {
        const updated = applyPrimarySession(stored.progress, session);
        const changed = JSON.stringify(stored.progress) !== JSON.stringify(updated);
        const progressOk = !changed || writePrimaryProgress(localStorage, updated);
        const ok = progressOk && saveSessionActivity(localStorage, profileId, session, "lesson", Date.now());
        progressFailure.current = !ok;
        setProgressError(!ok);
        if (ok && changed) window.dispatchEvent(new Event("primary-progress-changed"));
      } catch { progressFailure.current = true; setProgressError(true); }
    }, generation.current).catch(() => { blocked.current = true; setSaveError(true); });
  }, [session, profileId, course.manifest.id, lesson.id, sessionStage, sessionSpelling, saveError]);
  const leaveFinished = async (action: () => void) => {
    if (progressError && !saveError) { action(); return; }
    const cleared = saveError || await withPrimaryLock(profileId, course.manifest.id, () => progressFailure.current || clearCheckpoint(localStorage, { profileId, courseId: course.manifest.id, lessonId: lesson.id }, expected.current), generation.current).catch(() => false);
    if (!cleared) {
      setSaveError(true);
      return;
    }
    action();
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [session.index]);
  useEffect(() => {
    const tick = () => dispatchRaw({ type: "tick", at: Date.now(), visible: document.visibilityState === "visible" });
    document.addEventListener("visibilitychange", tick);
    const interval = window.setInterval(tick, 1000);
    return () => {
      document.removeEventListener("visibilitychange", tick);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="page preview-study">
      <div className="preview-study-toolbar">
        <button className="btn btn-ghost" onClick={() => (session.endedAt ? leaveFinished(onExit) : setExitOpen(true))}>
          <ArrowLeft size={18} /> 返回主题
        </button>
        <span>{lesson.title}</span>
        <span>{session.endedAt ? "这次的小发现" : `${session.index + 1} / ${session.steps.length}`}</span>
      </div>
      {saveError && <p role="alert" className="preview-disclosure">这次小课暂时无法保存：本地记录不可用或已在其他页面更改。原有记录会保留，本页的后续操作可能无法恢复。</p>}
      {progressError && !saveError && <p role="alert" className="preview-disclosure">学习结果暂时无法保存，已保留本次小课记录，可稍后重新打开并重试。</p>}
      <div className="preview-progress" role="progressbar" aria-label="小课进度"
        aria-valuenow={session.index} aria-valuemin={0} aria-valuemax={session.steps.length || 1}>
        <span style={{ width: `${session.steps.length ? (session.index / session.steps.length) * 100 : 0}%` }} />
      </div>
      {session.endedAt || !step || !entry ? (
        <section className="panel preview-finish">
          <Leaf size={44} strokeWidth={1.3} />
          <p className="eyebrow">A LITTLE DISCOVERY</p>
          <h1 className="display">今天，又认识了新朋友。</h1>
          <p>{session.endReason === "time-limit" ? "这次先休息一下，下次再一起探索。" : "一起回到生活里，找找刚才遇见的词吧。"}</p>
          <dl className="mini-stats is-detailed">
            <div><dt>接触过</dt><dd>{stats.introduced}<small>个</small></dd></div>
            <div><dt>独立答对</dt><dd>{stats.independent}<small>个</small></dd></div>
            <div><dt>提示后答对</dt><dd>{stats.hinted}<small>个</small></dd></div>
            <div><dt>一起答对</dt><dd>{stats.assisted}<small>个</small></dd></div>
          </dl>
          <p className="preview-disclosure">仅统计首次答对；接触和答对不代表已经掌握。{saveError ? "本次小课未能保存。" : progressError ? "学习结果暂未保存，小课记录已保留。" : "学习记录保存在这台设备。"}</p>
          <div className="preview-actions">
            <button className="btn btn-primary btn-xl" onClick={() => leaveFinished(onExit)}>回到主题 <ArrowRight size={18} /></button>
            <button className="btn btn-ghost" onClick={() => leaveFinished(onRestart)}>再体验一次</button>
          </div>
        </section>
      ) : (
        <>
          <header className="preview-question">
            <p className="eyebrow">{intro ? "先认识，再找一找" : "轮到你来找一找"}</p>
            <h1>{intro ? "看看这位新朋友" : step.kind === "listen-picture" ? "听一听，选出对应的图" : step.kind === "listen-word" ? "听一听，选出对应的词" : spellQuestion ? "试着拼出这个词" : "画里藏着哪个单词？"}</h1>
          </header>
          <section className={`panel preview-study-card ${intro ? "is-intro" : "is-recall"}`} data-content-id={entry.id} data-question-kind={step.kind}>
            <div key={`${entry.id}:${step.kind}`} className="preview-study-art" onErrorCapture={() => setFailedImageStep(session.index)}>
              {spellQuestion ? (
                <div className="primary-listen-prompt primary-spelling-prompt">
                  <p className="eyebrow">A LITTLE SPELLING</p>
                  <p>想一想这个词</p>
                  <h2>{entry.kind === "english" ? entry.meaning : entry.phrase}</h2>
                </div>
              ) : audioQuestion ? (
                <div className="primary-listen-prompt">
                  <p className="eyebrow">LISTEN &amp; FIND</p>
                  <h2>先听一听</h2>
                  <p>可以多听几遍，再慢慢选。</p>
                  <PreviewSpeak key={`${session.index}:${entry.id}`} text={entryLabel(entry)} locale={entry.media.locale}
                    recording={course.audio(entry)} slow={slow} accessibleLabel="播放题目发音"
                    onPlaybackState={(state) => setAudioPlayback({ index: session.index, state })} />
                </div>
              ) : (
                <Illustration src={course.img(entry)} word={intro ? entryLabel(entry) : "图片暂未加载"} eager
                  alt={intro && entry.kind === "english" ? entry.meaning : "请根据画面选择对应的词"} />
              )}
              {imageMissing && <p role="status">这幅图暂时没打开，可以先跳过。</p>}
            </div>
            <div className="preview-study-content">
              {intro && <PrimaryFavorite profileId={profileId} courseId={course.manifest.id} entry={entry} />}
              {intro ? (
                entry.kind === "english" ? <EnglishWordCard key={entry.id} entry={entry} course={course}
                  stage={sessionStage} slow={slow} onContinue={() => dispatch({ type: "next" })} /> : null
              ) : (
                <>
                  <p className="preview-prompt">{spellQuestion ? "输入英文单词" : step.kind === "listen-picture" ? "选一幅图" : "选一张词卡"}</p>
                  {spellQuestion ? (
                    <form className="primary-spelling-form" onSubmit={(event) => {
                      event.preventDefault();
                      if (!answered && spellingValue.trim())
                        dispatchRaw({ type: "answer", at: Date.now(), value: spellingValue });
                    }}>
                      <input aria-label="输入英文单词" lang="en" autoComplete="off" autoCapitalize="none" spellCheck={false}
                        value={spellingValue} disabled={answered}
                        onChange={(event) => setSpellingInput({ index: session.index, value: event.target.value })} />
                      {!answered && <button type="submit" className="btn btn-primary" disabled={!spellingValue.trim()}>确认答案 <ArrowRight size={18} /></button>}
                    </form>
                  ) : <div className={`preview-options ${step.kind === "listen-picture" ? "is-picture-choice" : ""}`} onErrorCapture={() => setFailedImageStep(session.index)}>
                    {(step.options ?? []).map((id, index) => {
                      const option = entries.find((item) => item.id === id);
                      if (!option) return null;
                      return <button key={id} data-option-id={id} disabled={answered || unableToAnswer}
                        aria-label={step.kind === "listen-picture" ? `图片选项 ${index + 1}：${option.kind === "english" ? option.meaning : option.phrase}` : undefined}
                        className={`preview-option ${answered && id === entry.id ? "is-answer" : ""}`}
                        onClick={() => dispatchRaw({ type: "answer", at: Date.now(), optionId: id })}>
                        {step.kind === "listen-picture" ? <Illustration src={course.img(option)} word="图片暂未加载" eager alt={`图片选项 ${index + 1}`} /> : entryLabel(option)}
                        {answered && id === entry.id && <Check size={20} />}
                      </button>;
                    })}
                  </div>}
                  {failedImage && step.kind === "listen-picture" && <p role="status">选项图片暂时没打开，可以先跳过。</p>}
                  <div className="preview-feedback" aria-live="polite">
                    {answered && result?.outcome === "answered" ? (
                      <><strong>{result.correct ? "找到了！" : "我们再认识一下。"}</strong>
                        <span>{entry.kind === "english" ? `${entry.word} 是${entry.meaning}。` : entry.phrase}</span>
                        {result.support !== "independent" && <small>这次是一起找到的，不计作独立答对。</small>}</>
                    ) : session.support !== "independent" ? (
                      <><strong>{entryLabel(entry)}</strong><span>{session.support === "assisted" ? "请家长一起找找这个新朋友。" : "看看它的样子，再找一找。"}</span></>
                    ) : <span>{audioQuestion && audioState !== "ready" ? "先听一听，再慢慢选。" : "慢慢来，不计时。"}</span>}
                  </div>
                  {answered ? <button className="btn btn-primary btn-xl" onClick={() => dispatch({ type: "next" })}>
                    继续 <ArrowRight size={20} />
                  </button> : <div className="preview-support">
                    <button className="btn btn-ghost" disabled={unableToAnswer} onClick={() => dispatchRaw({ type: "support", support: "hinted", at: Date.now() })}>给我一点提示</button>
                    <button className="btn btn-ghost" disabled={unableToAnswer} onClick={() => dispatchRaw({ type: "support", support: "assisted", at: Date.now() })}>请家长帮忙</button>
                  </div>}
                </>
              )}
            </div>
          </section>
          {!answered && <button className="btn preview-skip" onClick={() => dispatch({ type: resourceFailed && !intro ? "resource-error" : "skip" })}>
            先跳过，下次再认识
          </button>}
          <p className="preview-disclosure">图片与内容为体验草稿；{saveError ? "本次小课暂时无法保存。" : progressError ? "学习结果暂未保存，小课记录已保留。" : "小课保存在这台设备，再次打开同一主题可继续。"}</p>
        </>
      )}
      <Sheet open={exitOpen} onClose={closeExit} label="暂时结束小课">
        <div className="preview-parent">
          <h2>先休息一下吗？</h2>
          <p>{saveError ? "当前小课暂时无法保存，返回后本次进度可能无法恢复；原有记录会保留。" : progressError ? "学习结果暂时无法保存，本次小课记录已保留；返回后可重新打开并重试。" : "返回主题后，下次打开同一主题可以接着进行。学习记录保存在这台设备。"}</p>
          <div className="preview-actions">
            <button className="btn btn-primary" onClick={closeExit}>继续这次小课</button>
            <button className="btn btn-ghost" onClick={onExit}>结束体验</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
