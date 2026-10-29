import { saveSessionActivity } from "../learning/activity-record";
import { ArrowLeft, ArrowRight, Check, Volume2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Course } from "../atlas/types";
import { createLearningSession, currentStep, learningReducer, learningSessionStats, type LearningAction } from "../learning/session";
import { applyPrimarySession, primaryReviewIds, readPrimaryProgress, readRestoreGeneration, withPrimaryLock, writePrimaryProgress } from "../learning/primary-progress";
import { Illustration } from "../ui/Illustration";
import { Sheet } from "../ui/Sheet";
import { HanziCard } from "./HanziCard";
import { hanziPosition, hanziQuestionPrompt, isHanziMatchingQuestion, hanziRecognitionSession } from "./hanzi-question";
import { createListenGate, type ListenStatus } from "./hanzi-listen";
import { hanziPolicy, type HanziLessonMode } from "./hanzi-policy";
import { findMandarinVoice, hasMandarinVoice, watchMandarinVoice } from "./hanzi-voice";
import { clearHanziCheckpoint, readHanziCheckpoint, saveHanziCheckpoint } from "./hanzi-checkpoint";
import { PrimaryFavorite } from "./PrimaryJourney";
import { entryLabel, type HanziEntry, type LearningEntry, type Lesson } from "./types";

/**
 * Preschool Hanzi lesson. Co-reading browses characters and never grades a
 * recall; a lesson asks "which character means this?" without pinyin or typing.
 */
export function HanziLesson({ course, lesson, entries, profileId, mode, minutes, count, slow, onExit, onRestart }: {
  course: Course;
  lesson: Lesson;
  entries: HanziEntry[];
  profileId: string;
  mode: HanziLessonMode;
  minutes: number;
  count: number;
  slow: boolean;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [voiceAvailable, setVoiceAvailable] = useState(() =>
    hasMandarinVoice(typeof window === "undefined" ? undefined : window),
  );
  useEffect(
    () =>
      watchMandarinVoice(
        typeof window === "undefined" ? undefined : window,
        setVoiceAvailable,
      ),
    [],
  );

  const [loaded] = useState(() =>
    readHanziCheckpoint(
      localStorage,
      {
        profileId,
        courseId: course.manifest.id,
        lessonId: lesson.id,
        mode,
        contentVersion: course.manifest.version,
        entries,
        voiceAvailable,
      },
      Date.now(),
    ),
  );
  const expected = useRef<string | null>(loaded.raw);
  const generation = useRef(readRestoreGeneration(localStorage));
  const blocked = useRef(loaded.status === "invalid");
  const [saveError, setSaveError] = useState(loaded.status === "invalid");
  const [progressError, setProgressError] = useState(false);
  const progressFailure = useRef(false);
  const [sessionMode] = useState(loaded.status === "ok" ? loaded.checkpoint.mode : mode);
  const [sessionVoice] = useState(loaded.status === "ok" ? loaded.checkpoint.voiceAvailable : voiceAvailable);
  const [sessionMinutes] = useState(loaded.status === "ok" ? loaded.checkpoint.minutes : minutes);

  const [session, dispatchRaw] = useReducer(learningReducer, undefined, () => {
    if (loaded.status === "ok") return loaded.checkpoint.session;
    const now = Date.now();
    const saved = readPrimaryProgress(localStorage, profileId, course.manifest.id);
    const progress = saved.ok ? saved.progress : null;
    const coRead = sessionMode === "co-read";
    const reviewIds = progress ? primaryReviewIds(progress, now) : [];
    const due = reviewIds
      .map((id) => entries.find((entry) => entry.id === id))
      .filter((entry): entry is HanziEntry => !!entry);
    const fresh = progress
      ? entries.filter((entry) => !Object.hasOwn(progress.introduced, entry.id) && !progress.cards[entry.id])
      : entries;
    const created = createLearningSession({
      courseId: course.manifest.id,
      contentVersion: course.manifest.version,
      policy: hanziPolicy({
        voiceAvailable: sessionVoice,
        disablePicture: lesson.id.startsWith("draft-hanzi-"),
        coReading: coRead,
        entryCount: count,
        timeLimitMinutes: sessionMinutes > 0 ? sessionMinutes : null,
      }),
      pool: entries,
      due: coRead ? [] : due,
      fresh: coRead ? entries : fresh,
      requestedNewCount: count,
      introOnly: coRead,
      now,
      seed: now,
      visible: typeof document === "undefined" ? true : document.visibilityState === "visible",
    });
    created.id = `learn-${globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`}`;
    return created;
  });

  const [exitOpen, setExitOpen] = useState(false);
  const [failedImageStep, setFailedImageStep] = useState<number | null>(null);
  const [listenStatus, setListenStatus] = useState<ListenStatus>("idle");
  const listenStep = useRef(session.index);
  const listenGate = useRef<ReturnType<typeof createListenGate> | null>(null);
  if (!listenGate.current) listenGate.current = createListenGate(setListenStatus);
  const closeExit = useCallback(() => setExitOpen(false), []);
  const dispatch = (action: Omit<LearningAction, "at"> & { at?: number }) =>
    dispatchRaw({ ...action, at: action.at ?? Date.now() } as LearningAction);

  const step = currentStep(session);
  const entry = entries.find((item) => item.id === step?.contentId);
  const answered = !!step && !!session.answeredSteps[session.index];
  const attempt = entry ? session.attempts[entry.id] : undefined;
  const attemptResult = attempt?.result;
  const lifeTip =
    entries.find((item) => session.introduced.includes(item.id))?.caregiverTip ?? "";
  // Visual matching exposes the answer in the prompt; keep the attempt for
  // session recovery, but do not count it as independent recognition.
  const recognitionSession = hanziRecognitionSession(session, lesson.id);
  const stats = learningSessionStats(recognitionSession);
  const intro = step?.kind === "intro";
  const listenQuestion = step?.kind === "hanzi-listen";
  const pictureQuestion = step?.kind === "hanzi-picture";
  const contextQuestion = step?.kind === "hanzi-question";
  const matchingQuestion = !!step && isHanziMatchingQuestion(lesson.id, step.kind);
  const currentListenStatus = listenStep.current === session.index ? listenStatus : "idle";
  const failedImage = failedImageStep === session.index;
  const imageMissing = (intro || pictureQuestion) && (!entry?.media.image || failedImage);
  const resourceFailed = !!imageMissing || (listenQuestion && currentListenStatus === "failed");
  const unableToAnswer = !!resourceFailed || (listenQuestion && (!sessionVoice || currentListenStatus !== "ready"));
  const coRead = sessionMode === "co-read";

  useEffect(() => {
    if (saveError) return;
    void withPrimaryLock(profileId, course.manifest.id, () => {
      if (blocked.current) return;
      const raw = saveHanziCheckpoint(
        localStorage,
        {
          version: 1,
          profileId,
          courseId: course.manifest.id,
          lessonId: lesson.id,
          mode: sessionMode,
          voiceAvailable: sessionVoice,
          minutes: sessionMinutes,
          session,
        },
        expected.current,
      );
      if (raw === null) {
        blocked.current = true;
        setSaveError(true);
        return;
      }
      expected.current = raw;
      const stored = readPrimaryProgress(localStorage, profileId, course.manifest.id);
      if (!stored.ok) {
        progressFailure.current = true;
        setProgressError(true);
        return;
      }
      try {
        const updated = applyPrimarySession(stored.progress, recognitionSession);
        const changed = JSON.stringify(stored.progress) !== JSON.stringify(updated);
        const progressOk = !changed || writePrimaryProgress(localStorage, updated);
        const ok = progressOk && saveSessionActivity(localStorage, profileId, recognitionSession, sessionMode, Date.now());
        progressFailure.current = !ok;
        setProgressError(!ok);
        if (ok && changed) window.dispatchEvent(new Event("primary-progress-changed"));
      } catch {
        progressFailure.current = true;
        setProgressError(true);
      }
    }, generation.current).catch(() => {
      blocked.current = true;
      setSaveError(true);
    });
  }, [session, profileId, course.manifest.id, lesson.id, sessionMode, sessionVoice, sessionMinutes, saveError]);

  const leaveFinished = async (action: () => void) => {
    if (progressError && !saveError) {
      action();
      return;
    }
    const cleared =
      saveError ||
      (await withPrimaryLock(profileId, course.manifest.id, () =>
        progressFailure.current ||
        clearHanziCheckpoint(
          localStorage,
          {
            profileId,
            courseId: course.manifest.id,
            lessonId: lesson.id,
            mode: sessionMode,
          },
          expected.current,
        ),
        generation.current,
      ).catch(() => false));
    if (!cleared) {
      setSaveError(true);
      return;
    }
    action();
  };

  useEffect(() => {
    listenStep.current = session.index;
    listenGate.current?.reset();
    window.scrollTo({ top: 0 });
    return () => listenGate.current?.dispose();
  }, [session.index]);
  useEffect(() => {
    const tick = () =>
      dispatchRaw({ type: "tick", at: Date.now(), visible: document.visibilityState === "visible" });
    document.addEventListener("visibilitychange", tick);
    const interval = window.setInterval(tick, 1000);
    return () => {
      document.removeEventListener("visibilitychange", tick);
      window.clearInterval(interval);
    };
  }, []);

  const optionLabel = (option: LearningEntry) =>
    option.kind === "hanzi" ? option.character : entryLabel(option);

  return (
    <div className="page preview-study hanzi-lesson">
      <div className="preview-study-toolbar">
        <button
          className="btn btn-ghost"
          onClick={() => (session.endedAt ? leaveFinished(onExit) : setExitOpen(true))}
        >
          <ArrowLeft size={18} /> 返回主题
        </button>
        <span>{lesson.title}</span>
        <span>{session.endedAt ? "这次的小发现" : "慢慢来"}</span>
      </div>
      {saveError && (
        <p role="alert" className="preview-disclosure">
          这次共读暂时无法保存：本地记录不可用或已在其他页面更改。原有记录会保留。
        </p>
      )}
      {progressError && !saveError && (
        <p role="alert" className="preview-disclosure">
          认识结果暂时无法保存，已保留本次共读记录，可稍后重新打开并重试。
        </p>
      )}
      <div
        className="preview-progress"
        role="progressbar"
        aria-label="小课进度"
        aria-valuenow={session.index}
        aria-valuemin={0}
        aria-valuemax={session.steps.length || 1}
      >
        <span style={{ width: `${session.steps.length ? (session.index / session.steps.length) * 100 : 0}%` }} />
      </div>
      {session.endedAt || !step || !entry || entry.kind !== "hanzi" ? (
        <section className="panel preview-finish">
          <span className="hanzi-finish-mark" aria-hidden="true">字</span>
          <p className="eyebrow">A LITTLE CHARACTER</p>
          <h1 className="display">
            {session.steps.length === 0
              ? "今天的字都看过了。"
              : coRead
                ? "今天一起读了几页字。"
                : "今天一起找了字。"}
          </h1>
          <p>
            {session.steps.length === 0
              ? "先休息一下，下次再来读一读。"
              : session.endReason === "time-limit"
                ? "这次先休息一下，下次再一起读。"
                : "回到生活里，找找刚才看到的字吧。"}
          </p>
          <dl className="mini-stats is-detailed">
            <div>
              <dt>一起看过</dt>
              <dd>{stats.introduced}<small>个</small></dd>
            </div>
            <div>
              <dt>自己找对</dt>
              <dd>{coRead ? 0 : stats.independent}<small>个</small></dd>
            </div>
            <div>
              <dt>提示后找对</dt>
              <dd>{stats.hinted}<small>个</small></dd>
            </div>
            <div>
              <dt>一起找对</dt>
              <dd>{stats.assisted}<small>个</small></dd>
            </div>
          </dl>
          <p className="preview-disclosure">
            {coRead
              ? "共读只是看看字，不计识别成绩。"
              : "只统计首次找对；提示、家长帮忙和跳过不计入“自己找对”。"}
            {saveError ? "本次小课未能保存。" : progressError ? "学习结果暂未保存，小课记录已保留。" : "学习记录保存在这台设备。"}
            {!coRead && lesson.id.startsWith("draft-hanzi-") && " 照样找字不计作独立识字。"}
          </p>
          {lifeTip && session.steps.length > 0 && (
            <aside className="hanzi-life-tip" aria-label="回家可以试试">
              <p className="eyebrow">回家可以试试</p>
              <p>{lifeTip}</p>
            </aside>
          )}
          <div className="preview-actions">
            <button className="btn btn-primary btn-xl" onClick={() => leaveFinished(onExit)}>
              回到主题 <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost" onClick={() => leaveFinished(onRestart)}>再体验一次</button>
          </div>
        </section>
      ) : (
        <>
          <header className="preview-question">
            <p className="eyebrow">{intro ? (coRead ? "和家长一起读一读" : "先认一认，再找一找") : "轮到你来找一找"}</p>
            <h1>
              {intro
                ? "一个字，一个小发现"
                : step.kind === "hanzi-listen"
                  ? `听词语，找第${hanziPosition(entry) ?? "一"}个字`
                  : step.kind === "hanzi-picture"
                    ? "看这幅画，选出对应的字"
                    : hanziQuestionPrompt(entry, lesson.id)}
            </h1>
          </header>
          <section
            className={`panel preview-study-card hanzi-study-card ${intro ? "is-intro" : "is-recall"}`}
            data-content-id={entry.id}
            data-question-kind={step.kind}
          >
            <div className="preview-study-art" onErrorCapture={() => setFailedImageStep(session.index)}>
              {listenQuestion ? (
                <div className="hanzi-listen-prompt">
                  <span className="hanzi-listen-mark" aria-hidden="true">听</span>
                  <p>先听一听，再慢慢选。</p>
                  <button
                    type="button"
                    className="btn btn-ghost hanzi-listen-button"
                    onClick={() => listenGate.current?.start((complete, fail) => {
                      if (!("speechSynthesis" in window) || !sessionVoice) { fail(); return; }
                      window.speechSynthesis.cancel();
                      const voice = findMandarinVoice(window.speechSynthesis.getVoices());
                      if (!voice) { fail(); return; }
                      const utterance = new SpeechSynthesisUtterance(entry.phrase);
                      utterance.lang = "zh-CN";
                      utterance.voice = voice;
                      utterance.rate = slow ? 0.6 : 0.8;
                      utterance.onend = complete;
                      utterance.onerror = fail;
                      window.speechSynthesis.speak(utterance);
                    })}
                  >
                    <Volume2 size={20} /> 播放词语
                  </button>
                  {currentListenStatus === "playing" && <p role="status">正在播放，听完再选。</p>}
                  {currentListenStatus === "failed" && (
                    <p role="status">这次声音没有播放完成，可以再试一次，或先跳过。</p>
                  )}
                </div>
              ) : contextQuestion ? (
                <div className="hanzi-listen-prompt">
                  <span className="hanzi-listen-mark" aria-hidden="true">找</span>
                  <p>和家长一起读题，再找一找。</p>
                </div>
              ) : (
                <Illustration
                  key={course.img(entry) ?? entry.id}
                  src={course.img(entry)}
                  word={entry.character}
                  eager
                  alt={intro ? entry.phrase : "请根据画面选择对应的字"}
                />
              )}
              {imageMissing && <p role="status">这幅图暂时没打开，可以先跳过。</p>}
            </div>
            <div className="preview-study-content">
              {intro && <PrimaryFavorite profileId={profileId} courseId={course.manifest.id} entry={entry} />}
              {intro ? (
                <HanziCard
                  entry={entry}
                  course={course}
                  slow={slow}
                  coRead={coRead}
                  onContinue={() => dispatch({ type: "next" })}
                />
              ) : (
                <>
                  <p className="preview-prompt">
                    选一个字
                  </p>
                  <div className="preview-options is-hanzi">
                    {(step.options ?? []).map((id) => {
                      const option = entries.find((item) => item.id === id);
                      if (!option) return null;
                      return (
                        <button
                          key={id}
                          data-option-id={id}
                          disabled={answered || unableToAnswer}
                          className={`preview-option hanzi-option ${answered && id === entry.id ? "is-answer" : ""}`}
                          onClick={() => dispatchRaw({ type: "answer", at: Date.now(), optionId: id })}
                        >
                          {optionLabel(option)}
                          {answered && id === entry.id && <Check size={22} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="preview-feedback" aria-live="polite">
                    {answered && attemptResult ? (
                      <>
                        <strong>
                          {attemptResult.outcome === "answered" && attemptResult.correct
                            ? "找到了！"
                            : "我们再认一认。"}
                        </strong>
                        <span>{entry.phrase} · {entry.sentence}</span>
                        {attemptResult.outcome === "answered" && matchingQuestion && (
                          <small>这是找相同的字，不计作独立识字。</small>
                        )}
                        {attemptResult.outcome === "answered" && !matchingQuestion &&
                          attemptResult.support !== "independent" && (
                            <small>这次是一起找到的，不计作独立识别。</small>
                          )}
                      </>
                    ) : session.support !== "independent" ? (
                      <>
                        <strong>{entry.phrase}</strong>
                        <span>
                          {session.support === "assisted"
                            ? "请家长和孩子一起找找这个字。"
                            : "看看它的样子，再找一找。"}
                        </span>
                      </>
                    ) : (
                      <span>{listenQuestion && currentListenStatus !== "ready" ? "先播放词语，听完再选。" : "慢慢来，不计时。"}</span>
                    )}
                  </div>
                  {answered ? (
                    <button className="btn btn-primary btn-xl" onClick={() => dispatch({ type: "next" })}>
                      继续 <ArrowRight size={20} />
                    </button>
                  ) : (
                    <div className="preview-support">
                      <button
                        className="btn btn-ghost"
                        disabled={unableToAnswer}
                        onClick={() => dispatchRaw({ type: "support", support: "hinted", at: Date.now() })}
                      >
                        给我一点提示
                      </button>
                      <button
                        className="btn btn-ghost"
                        disabled={unableToAnswer}
                        onClick={() => dispatchRaw({ type: "support", support: "assisted", at: Date.now() })}
                      >
                        请家长帮忙
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
          {!answered && (
            <button
              className="btn preview-skip"
              onClick={() => dispatch({ type: resourceFailed && !intro ? "resource-error" : "skip" })}
            >
              先跳过，下次再认识
            </button>
          )}
          <p className="preview-disclosure">
            字卡与插画为体验草稿；普通话优先使用设备朗读，失败时请家长共读。
            {!sessionVoice && " 这台设备没有可用的普通话声音。"}
          </p>
        </>
      )}
      <Sheet open={exitOpen} onClose={closeExit} label="暂时结束共读">
        <div className="preview-parent">
          <h2>先休息一下吗？</h2>
          <p>{saveError ? "当前小课暂时无法保存，返回后本次进度可能无法恢复；原有记录会保留。" : progressError ? "学习结果暂时无法保存，本次小课记录已保留；返回后可重新打开并重试。" : "返回主题后，下次打开同一个主题可以接着进行。学习记录保存在这台设备。"}</p>
          <div className="preview-actions">
            <button className="btn btn-primary" onClick={closeExit}>继续这次共读</button>
            <button className="btn btn-ghost" onClick={onExit}>结束体验</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
