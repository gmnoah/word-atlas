import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Leaf,
  Moon,
  Settings2,
  Sun,
  Volume2,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Illustration } from "../ui/Illustration";
import { Logo } from "../ui/Logo";
import { Sheet } from "../ui/Sheet";
import { Toasts } from "../ui/Toast";
import { store, useStore } from "../store/store";
import { stopAudio } from "../lib/audio";
import { setAmbience } from "../lib/sound";
import { go, useLocation } from "../lib/router";
import { loadCourse } from "../atlas/data";
import { isLearningEntry, type Course } from "../atlas/types";
import {
  preferencesFor,
  profileStore,
  useProfiles,
} from "../profiles/store";
import { contextCoordinator } from "../profiles/isolation";
import { courseRegistry, courseAction } from "./registry";
import {
  createPreviewSession,
  previewReducer,
  previewStats,
} from "./preview-session";
import { PreviewSpeak } from "./PreviewSpeak";
import { exampleTargetParts } from "./example-target";
import { PrimaryLesson } from "./PrimaryLesson";
import { PrimaryJourney, PrimaryTodayButton } from "./PrimaryJourney";
import { ActivitySummary } from "./ActivitySummary";
import { readPrimaryProgress } from "../learning/primary-progress";
import { journeyProgress, suggestedJourneyLessons } from "./journey-progress";
import { DraftReview } from "./DraftReview";
import { HanziLesson } from "./HanziLesson";
import { HanziMap } from "./HanziMap";
import { readHanziCheckpoint } from "./hanzi-checkpoint";
import { readCheckpoint } from "./primary-checkpoint";
import { checkpointSavedAt } from "./resume-order";
import { watchMandarinVoice } from "./hanzi-voice";
import { FamilyBackup, FamilyCourseNote, RecentActivity } from "./FamilyPanel";
import { CourseOpening } from "./CourseOpening";
import type { HanziLessonMode } from "./hanzi-policy";
import { entriesFromStartingPoint, primaryPreviewCount, recommendedPrimaryEntries, type PrimaryStartingStage } from "./starting-point";
import {
  entryLabel,
  type HanziEntry,
  type LearningEntry,
  type Lesson,
} from "./types";
import "./preview.css";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const CourseGalaxy = lazy(() => import("./CourseGalaxy"));
interface Preferences {
  englishCount: number;
  hanziCount: number;
  slow: boolean;
}

export default function CoursePreview() {
  useEffect(() => {
    stopAudio();
    void setAmbience(null);
  }, []);
  const { route } = useLocation();
  const courseId = route.page === "explore" ? route.courseId ?? null : null;
  const draftSubject = import.meta.env.DEV && courseId === "draft-english" ? "english" : import.meta.env.DEV && courseId === "draft-hanzi" ? "hanzi" : null;
  const entryId = route.page === "explore" ? route.entryId : undefined;
  const courseView = route.page === "explore" ? route.view : undefined;
  const [course, setCourse] = useState<Course | null>(null);
  const [courseEntries, setCourseEntries] = useState<LearningEntry[]>([]);
  const entriesById = useMemo(() => new Map(courseEntries.map((entry) => [entry.id, entry])), [courseEntries]);
  const todayEntries = useMemo(() => recommendedPrimaryEntries(courseEntries, course?.lessons ?? []), [courseEntries, course]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [hanziMode, setHanziMode] = useState<HanziLessonMode>("lesson");
  const [startingStage, setStartingStage] = useState<PrimaryStartingStage>("starter");
  const [spellingEnabled, setSpellingEnabled] = useState(false);
  const [startingWords, setStartingWords] = useState<Record<string, string>>({});
  const [run, setRun] = useState(0);
  const [parentOpen, setParentOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [progressRevision, setProgressRevision] = useState(0);
  const [mandarinAvailable, setMandarinAvailable] = useState(false);
  useEffect(() => watchMandarinVoice(window, setMandarinAvailable), []);
  useEffect(() => {
    const refresh = () => setProgressRevision((revision) => revision + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("primary-progress-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("primary-progress-changed", refresh); };
  }, []);
  const activeProfileId = useProfiles((snapshot) => snapshot.activeProfileId);
  useEffect(() => setMapOpen(false), [courseId, activeProfileId]);
  const activeProfile = useProfiles(
    (snapshot) =>
      snapshot.profiles.find((profile) => profile.id === snapshot.activeProfileId) ?? snapshot.profiles[0]!,
  );
  const profiles = useProfiles((snapshot) => snapshot.profiles);
  const exploration = useMemo(() => {
    void progressRevision;
    if (!course || !courseId || course.manifest.id !== courseId) return null;
    const result = readPrimaryProgress(localStorage, activeProfileId, courseId);
    return result.ok ? journeyProgress(result.progress, course.lessons ?? [], courseEntries.map((entry) => entry.id)) : null;
  }, [activeProfileId, courseId, course, courseEntries, progressRevision]);
  const primaryPreferences = useProfiles((snapshot) =>
    preferencesFor(snapshot, activeProfileId, "primary-starter"),
  );
  const hanziPreferences = useProfiles((snapshot) =>
    preferencesFor(snapshot, activeProfileId, "hanzi-starter"),
  );
  const resumableHanzi = useMemo(() => {
    void progressRevision;
    if (!course || course.manifest.id !== "hanzi-starter" || courseId !== course.manifest.id) return { best: null, fallback: null, recognition: null, recognitionFallback: null, invalid: false };
    let invalid = false;
    let best: { lesson: Lesson; mode: HanziLessonMode; savedAt: number } | null = null;
    let fallback: Lesson | null = null;
    let recognition: { lesson: Lesson; savedAt: number } | null = null;
    let recognitionFallback: Lesson | null = null;
    const now = Date.now();
    for (const item of course.lessons ?? []) {
      const entries = item.entryIds.map((id) => entriesById.get(id)).filter((entry): entry is HanziEntry => !!entry && entry.kind === "hanzi");
      for (const mode of ["co-read", "lesson"] as const) {
        const result = readHanziCheckpoint(localStorage, { profileId: activeProfileId, courseId: course.manifest.id, lessonId: item.id,
          mode, contentVersion: course.manifest.version, entries, voiceAvailable: mandarinAvailable }, now);
        if (result.status === "invalid") invalid = true;
        if (mode === "co-read" && result.status === "empty" && !fallback) fallback = item;
        if (mode === "lesson" && result.status === "empty" && !recognitionFallback) recognitionFallback = item;
        if (result.status === "ok" && !result.checkpoint.session.endReason) {
          const savedAt = checkpointSavedAt(result.raw, result.checkpoint.session.startedAt, now);
          if (!best || savedAt > best.savedAt) best = { lesson: item, mode, savedAt };
          if (mode === "lesson" && (!recognition || savedAt > recognition.savedAt)) recognition = { lesson: item, savedAt };
        }
      }
    }
    return { best, fallback, recognition, recognitionFallback, invalid };
  }, [course, courseId, entriesById, activeProfileId, mandarinAvailable, progressRevision, lesson]);
  const [nicknameDraft, setNicknameDraft] = useState(activeProfile.nickname);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const theme = useStore((s) => s.settings.theme);
  const openingEnabled = useStore((s) => s.settings.splash);
  const preferences: Preferences =
    course?.manifest.id === "hanzi-starter" ? hanziPreferences : primaryPreferences;
  const lessonPreferences: Preferences = course?.manifest.id === "primary-starter"
    ? { ...preferences, englishCount: primaryPreviewCount(preferences.englishCount, startingStage) }
    : preferences;
  const openCourse = (id: string, view?: "journey" | "atlas") => {
    const action = courseAction(id);
    if (action.kind === "preview") go({ page: "explore", courseId: action.courseId, view });
  };
  const closeParent = useCallback(() => setParentOpen(false), []);
  const closeEntry = useCallback(() => {
    if (route.page === "explore") go({ page: "explore", courseId: route.courseId, view: route.view });
  }, [route]);
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const leaveCourse = () => {
    setLesson(null);
    go({ page: "explore" });
  };

  useEffect(() => {
    // When active learner changes, cleanly isolate from previous learner's state
    stopAudio();
    setLesson(null);
    setHanziMode("lesson");
    setRun(0);
    setStartingStage("starter");
    setSpellingEnabled(false);
    setStartingWords({});
  }, [activeProfileId]);

  useEffect(() => {
    if (draftSubject) {
      contextCoordinator.switchContext({ profileId: activeProfileId, courseId: null });
      setLesson(null); setCourse(null); setCourseEntries([]); setCourseError(null); setCourseLoading(false);
      return;
    }
    if (!courseId) {
      contextCoordinator.switchContext({ profileId: activeProfileId, courseId: null });
      setCourse(null);
      setCourseEntries([]);
      setCourseError(null);
      setCourseLoading(false);
      return;
    }
    const { token, controller } = contextCoordinator.switchContext({
      profileId: activeProfileId,
      courseId,
    });
    setLesson(null);
    setCourse(null);
    setCourseEntries([]);
    setCourseError(null);
    setCourseLoading(true);

    void loadCourse(courseId, { signal: controller.signal })
      .then(async (nextCourse) => {
        const ids = [...new Set(nextCourse.lessons?.flatMap((item) => item.entryIds) ?? [])];
        const entries = (await Promise.all(ids.map((id) => nextCourse.entry(id)))).filter(isLearningEntry);
        if (controller.signal.aborted || !contextCoordinator.isValid(token, { profileId: activeProfileId, courseId }))
          return;
        setCourse(nextCourse);
        setCourseEntries(entries);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !contextCoordinator.isValid(token, { profileId: activeProfileId, courseId }))
          return;
        setCourseError(error instanceof Error ? error.message : "课程暂时无法打开");
      })
      .finally(() => {
        if (!controller.signal.aborted && contextCoordinator.isValid(token, { profileId: activeProfileId, courseId })) {
          setCourseLoading(false);
        }
      });
    return () => controller.abort();
  }, [courseId, activeProfileId, draftSubject]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [courseId, lesson, run]);
  useEffect(() => {
    setNicknameDraft(activeProfile.nickname);
    setProfileMessage(null);
  }, [activeProfile.id, activeProfile.nickname]);

  return (
    <div className={`app preview-app ${lesson ? "is-focus" : ""}`}>
      <header className="preview-topbar">
        {lesson ? (
          <Logo />
        ) : (
          <a
            href="#/explore"
            onClick={(event) => {
              event.preventDefault();
              leaveCourse();
            }}
            aria-label="词光学习空间"
          >
            <Logo />
          </a>
        )}
        <span className="preview-edition">
          学习空间 <i /> 体验版
        </span>
        <div className="preview-tools">
          {!lesson && (
            <button
              className="btn btn-ghost"
              onClick={() => setParentOpen(true)}
            >
              <Settings2 size={17} />
              <span>家长设置</span>
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => store.settings({ theme: dark ? "light" : "dark" })}
            aria-label={dark ? "切换到浅色" : "切换到深色"}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      <main className="main" id="main">
        {draftSubject ? <DraftReview subject={draftSubject} onBack={leaveCourse} /> : !courseId ? (
          <div className="page">
            <header className="greet preview-greet">
              <p className="eyebrow">WORD ATLAS · 一起探索</p>
              <h1 className="display">每一份好奇，都值得被点亮。</h1>
            </header>
            <section className="journey preview-hero">
              <img
                className="journey-art"
                src={asset("brand/hero.webp")}
                alt="书本展开成小岛，路径连接树木、灯塔和城堡"
                fetchPriority="high"
              />
              <div className="journey-body">
                <p className="eyebrow eyebrow-light">从身边的世界开始</p>
                <h2>
                  看一幅画，
                  <br />
                  认识一个<b>新朋友。</b>
                </h2>
                <p className="journey-lede">
                  听一听、找一找，让单词和汉字走进生活。
                </p>
                <div className="journey-actions">
                  <button
                    className="btn btn-primary btn-xl"
                    onClick={() => openCourse("primary-starter", "journey")}
                  >
                    探索基础英语 <ArrowRight size={20} />
                  </button>
                  <button
                    className="btn btn-glass"
                    onClick={() => openCourse("hanzi-starter", "journey")}
                  >
                    一起认汉字
                  </button>
                </div>
              </div>
            </section>
            <section className="preview-spaces" aria-labelledby="spaces-title">
              <div className="preview-section-heading">
                <div>
                  <p className="eyebrow">CHOOSE YOUR JOURNEY</p>
                  <h2 id="spaces-title">选择你的学习旅程</h2>
                </div>
                <span>同样的图鉴，不同的起点</span>
              </div>
              <div className="preview-space-grid">
                {courseRegistry
                  .filter((c) => c.kind !== "planned")
                  .map((registered, i) => {
                    return (
                      <article
                        key={registered.manifest.id}
                        className={`panel preview-space preview-space-${registered.manifest.subject}`}
                        data-course-id={registered.manifest.id}
                      >
                        <div className="preview-space-art">
                          <Illustration
                            src={asset(registered.cover)}
                            word={registered.manifest.title}
                          />
                          <span>{registered.badge}</span>
                        </div>
                        <div className="preview-space-body">
                          <p className="eyebrow">
                            {String(i + 1).padStart(2, "0")} /{" "}
                            {registered.eyebrow}
                          </p>
                          <h3>{registered.manifest.title}</h3>
                          <p>{registered.manifest.description}</p>
                          <div className="preview-space-meta">
                            {registered.kind === "legacy"
                              ? `${registered.count.toLocaleString("en-US")} 个词 · 原学习进度保留`
                              : `${registered.count} ${registered.manifest.subject === "english" ? "个词" : "个字"} · ${registered.lessonCount} 个学习单元 · 内容待审校`}
                          </div>
                          {registered.kind === "legacy" ? (
                            <a className="btn btn-ghost" href={registered.href}>
                              继续雅思旅程 <ArrowRight size={17} />
                            </a>
                          ) : (
                            <><button
                              className="btn btn-primary"
                              onClick={() => openCourse(registered.manifest.id, "journey")}
                            >
                              开始旅程 <ArrowRight size={17} />
                            </button><button
                              className="btn btn-ghost"
                              onClick={() => openCourse(registered.manifest.id)}
                            >
                              打开图鉴 <ArrowRight size={17} />
                            </button>
                            {import.meta.env.DEV && <button className="btn btn-ghost draft-review-entry" onClick={() => go({ page: "explore", courseId: registered.manifest.subject === "english" ? "draft-english" : "draft-hanzi" })}>
                              检查课程内容 <ArrowRight size={16} />
                            </button>}</>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
            <section className="preview-planned" aria-label="后续课程">
              {courseRegistry
                .filter((c) => c.kind === "planned")
                .map((registered) => (
                  <article
                    key={registered.manifest.id}
                    className="panel"
                    data-course-id={registered.manifest.id}
                  >
                    <div>
                      <p className="eyebrow">{registered.eyebrow}</p>
                      <h3>{registered.manifest.title}</h3>
                      <p>{registered.manifest.description}</p>
                    </div>
                    <button
                      className="btn btn-ghost"
                      disabled
                      aria-label={`${registered.manifest.title}待开放`}
                    >
                      {registered.badge}
                    </button>
                  </article>
                ))}
            </section>
            <div className="preview-note">
              <Leaf size={23} />
              <div>
                <h3>慢慢来，也是一种进步。</h3>
                <p>
                  每次认识一点点，可以随时停下。初中、高中课程将在后续开放。
                </p>
              </div>
            </div>
            <p className="preview-disclosure">
              课程内容待教学审校；小学小课的记录保存在本机。
              <a href="#/about">
                素材署名与项目说明 <ChevronRight size={13} />
              </a>
            </p>
          </div>
        ) : courseLoading ? (
          <div className="page preview-course-state" aria-busy="true">
            <span className="spinner" />
            <p>正在展开这本图鉴…</p>
          </div>
        ) : courseError || !course ? (
          <div className="page preview-course-state">
            <p className="eyebrow">暂时没能打开</p>
            <h1 className="display">这份图鉴需要再试一次。</h1>
            <p>{courseError ?? "课程数据不完整。"}</p>
            <button className="btn btn-primary" onClick={leaveCourse}>
              回到学习空间 <ArrowLeft size={18} />
            </button>
          </div>
        ) : lesson ? course.manifest.id === "primary-starter" ? (
          <PrimaryLesson
            key={`${activeProfileId}:${course.manifest.id}:${lesson.id}:${run}`}
            course={course}
            lesson={lesson}
            profileId={activeProfileId}
            entries={entriesFromStartingPoint(
              lesson.entryIds.map((id) => courseEntries.find((entry) => entry.id === id))
                .filter((entry): entry is LearningEntry => !!entry), startingWords[lesson.id],
            )}
            stage={startingStage}
            spellingEnabled={spellingEnabled}
            count={lessonPreferences.englishCount}
            slow={lessonPreferences.slow}
            onExit={() => setLesson(null)}
            onRestart={() => setRun((r) => r + 1)}
          />
        ) : course.manifest.subject === "hanzi" ? (
          <HanziLesson
            key={`${activeProfileId}:${course.manifest.id}:${lesson.id}:${run}:${hanziMode}`}
            course={course}
            lesson={lesson}
            profileId={activeProfileId}
            entries={
              lesson.entryIds
                .map((id) => courseEntries.find((entry) => entry.id === id))
                .filter((entry): entry is HanziEntry => !!entry && entry.kind === "hanzi")
            }
            mode={hanziMode}
            minutes={hanziPreferences.minutes}
            count={hanziPreferences.hanziCount}
            slow={hanziPreferences.slow}
            onExit={() => setLesson(null)}
            onRestart={() => setRun((r) => r + 1)}
          />
        ) : (
          <PreviewLesson
            key={`${course.manifest.id}:${lesson.id}:${run}`}
            course={course}
            lesson={lesson}
            entries={entriesFromStartingPoint(
              lesson.entryIds.map((id) => courseEntries.find((entry) => entry.id === id))
                .filter((entry): entry is LearningEntry => !!entry),
              course.manifest.id === "primary-starter" ? startingWords[lesson.id] : undefined,
            )}
            preferences={lessonPreferences}
            onExit={() => setLesson(null)}
            onRestart={() => setRun((r) => r + 1)}
          />
        ) : (
          <div className="page">
            <button
              className="btn btn-ghost preview-back"
              onClick={leaveCourse}
            >
              <ArrowLeft size={18} />
              学习空间
            </button>
            <header className="preview-course-head">
              <div>
                <p className="eyebrow">
                  {course.manifest.subject === "english"
                    ? "LITTLE EXPLORERS / 小学起步"
                    : "FIRST CHARACTERS / 亲子共读"}
                </p>
                <h1 className="display">{course.manifest.title}</h1>
                <p className="lede">{course.manifest.description}</p>
              </div>
              <BookOpen size={44} strokeWidth={1} />
            </header>
            <nav aria-label="课程导航" className="course-view-nav">
              <button className="btn btn-ghost" aria-current={courseView === "journey" ? "page" : undefined}
                onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "journey" })}>今日旅程</button>
              <button className="btn btn-ghost" aria-current={courseView !== "records" && courseView !== "journey" ? "page" : undefined}
                onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "atlas" })}>主题图鉴</button>
              <button className="btn btn-ghost" aria-current={courseView === "records" ? "page" : undefined}
                onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "records" })}>学习记录</button>
            </nav>
            {courseView === "records" ? <div className="panel course-records"><RecentActivity profileId={activeProfileId} profileName={activeProfile.nickname} />
              <ActivitySummary profileId={activeProfileId} courseId={course.manifest.id} />
              <details className="course-theme-records"><summary>查看主题足迹</summary>
                {exploration ? <><p>只统计看过的内容，并不表示已掌握。相同内容出现在多个主题时会分别显示。</p>
                  <ul>{(course.lessons ?? []).map((item) => {
                    const theme = exploration.themes.find((entry) => entry.id === item.id);
                    return <li key={item.id}>{item.title}：看过 {theme?.viewed ?? 0} / {theme?.total ?? 0} {course.manifest.subject === "hanzi" ? "个字" : "个词"}</li>;
                  })}</ul></> : <p role="alert">主题记录暂时无法读取，原数据已保留。</p>}
              </details>
              <p>更早的逐日活动详情仍在完善。</p></div> : courseView === "journey" ? <>
              <section className="journey preview-hero">
                <CourseOpening courseId={course.manifest.id} profileId={activeProfileId} enabled={openingEnabled} />
                <img className="journey-art" src={asset("brand/hero.webp")} alt="" />
                <div className="journey-body">
                  <p className="eyebrow eyebrow-light">{course.manifest.subject === "hanzi" ? "亲子探索" : "今日探索"}</p>
                  <h2>{course.manifest.subject === "hanzi" ? "一起看看生活里的字。" : "从一个小小的发现开始。"}</h2>
                  <p className="journey-lede">选择喜欢的主题，随时可以停下来。</p>
                  <div className="journey-actions">
                    {course.manifest.id === "primary-starter" && <PrimaryTodayButton profileId={activeProfileId} courseId={course.manifest.id} contentVersion={course.manifest.version}
                      entries={todayEntries} onToday={() => setLesson({ id: "today", title: "今日小课", subtitle: "回顾与发现", entryIds: todayEntries.map((entry) => entry.id) })} />}
                    {course.manifest.subject === "hanzi" && (resumableHanzi.best || resumableHanzi.fallback) && <button className="btn btn-primary btn-xl" onClick={() => { const next = resumableHanzi.best?.lesson ?? resumableHanzi.fallback; if (!next) return; setHanziMode(resumableHanzi.best?.mode ?? "co-read"); setLesson(next); }}>{resumableHanzi.best ? `${resumableHanzi.best.mode === "co-read" ? "继续共读" : "继续认一认"}：${resumableHanzi.best.lesson.title}` : "一起读一读"} <ArrowRight size={18} /></button>}
                    {course.manifest.subject === "hanzi" && resumableHanzi.best?.mode !== "lesson" && (resumableHanzi.recognition || resumableHanzi.recognitionFallback) && <button className="btn btn-glass" onClick={() => { const next = resumableHanzi.recognition?.lesson ?? resumableHanzi.recognitionFallback; if (!next) return; setHanziMode("lesson"); setLesson(next); }}>{resumableHanzi.recognition ? `继续认一认：${resumableHanzi.recognition.lesson.title}` : "试试认一认"}</button>}
                    <button className="btn btn-glass" onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "atlas" })}>选择主题</button>
                  </div>
                  {course.manifest.subject === "hanzi" && resumableHanzi.invalid && <p role="alert">部分小课记录无法读取，原记录已保留；可以选择其他主题。</p>}
                </div>
              </section>
              {course.manifest.id === "primary-starter" && <PrimaryJourney profileId={activeProfileId} courseId={course.manifest.id} contentVersion={course.manifest.version}
                entries={todayEntries} hideAction onToday={() => setLesson({ id: "today", title: "今日小课", subtitle: "回顾与发现", entryIds: todayEntries.map((entry) => entry.id) })} />}
              <details open={mapOpen} className="course-galaxy-section panel" onToggle={(event) => setMapOpen(event.currentTarget.open)}>
                <summary><span>探索知识星图</span><small>一颗星，是一个词或字</small></summary>
                {mapOpen && <Suspense fallback={<p>正在展开星图…</p>}><CourseGalaxy key={`${activeProfileId}:${course.manifest.id}`} entries={courseEntries} lessons={course.lessons ?? []} profileId={activeProfileId} courseId={course.manifest.id} revision={progressRevision} onOpen={(entry) => go({ page: "explore", courseId: course.manifest.id, view: "journey", entryId: entry.id })} /></Suspense>}
              </details>
              <section className="journey-stops" aria-labelledby="journey-stops-title">
                <div className="preview-section-heading"><div><p className="eyebrow">YOUR EXPLORATIONS</p><h2 id="journey-stops-title">去主题里看看</h2><p>优先展示最近初次看过的主题。</p></div></div>
                <div className="journey-stops-grid">
                  {suggestedJourneyLessons(course.lessons ?? [], exploration).map((item) => {
                    const first = item.entryIds.map((id) => entriesById.get(id)).find(Boolean);
                    const state = exploration?.themes.find((theme) => theme.id === item.id);
                    const itemEntries = item.entryIds.map((id) => entriesById.get(id)).filter((entry): entry is LearningEntry => !!entry);
                    const checkpoint = course.manifest.subject === "hanzi"
                      ? readHanziCheckpoint(localStorage, { profileId: activeProfileId, courseId: course.manifest.id, lessonId: item.id, mode: "co-read", contentVersion: course.manifest.version, entries: itemEntries.filter((entry): entry is HanziEntry => entry.kind === "hanzi"), voiceAvailable: mandarinAvailable }, Date.now())
                      : readCheckpoint(localStorage, { profileId: activeProfileId, courseId: course.manifest.id, lessonId: item.id, contentVersion: course.manifest.version, entries: entriesFromStartingPoint(itemEntries, startingWords[item.id]) }, Date.now());
                    const label = checkpoint.status === "ok" ? (checkpoint.checkpoint.session.endReason ? "查看上次小课" : course.manifest.subject === "hanzi" ? "继续共读" : "继续小课") : course.manifest.subject === "hanzi" ? "一起读一读" : "开始小课";
                    return <article className="panel journey-stop" data-state={state?.state ?? "unavailable"} key={item.id}>
                      {first && <Illustration src={course.img(first)} word={entryLabel(first)} />}
                      <div><h3>{item.title}</h3><p>{state ? state.state === "visited" ? "这一站都看过了" : state.state === "partial" ? "来过这里" : "等你来探索" : "学习记录暂不可用"}</p>
                        {state && state.total > 0 && <div className="journey-stop-progress">
                          <span>看过 {state.viewed} / {state.total} {course.manifest.subject === "hanzi" ? "个字" : "个词"}</span>
                          <progress value={state.viewed} max={state.total} aria-label={`${item.title}看过 ${state.viewed} / ${state.total} ${course.manifest.subject === "hanzi" ? "个字" : "个词"}`} />
                        </div>}
                        <button className="btn btn-ghost" disabled={checkpoint.status === "invalid"} onClick={() => { if (course.manifest.subject === "hanzi") setHanziMode("co-read"); setLesson(item); }}>{label} <ArrowRight size={16} /></button>
                        {checkpoint.status === "invalid" && <p role="alert">这次小课记录暂时无法读取，原记录已保留。可以选择其他主题。</p>}
                      </div>
                    </article>;
                  })}
                </div>
                <button className="btn btn-ghost" onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "atlas" })}>查看全部主题 <ArrowRight size={16} /></button>
              </section>
              <p className="preview-disclosure">主题进度来自本机学习记录；看过不代表掌握。</p>
            </> : <>
            {course.manifest.id === "primary-starter" && (
              <section className="preview-starting-stage" aria-labelledby="starting-stage-title">
                <div>
                  <p className="eyebrow">YOUR STARTING POINT</p>
                  <h2 id="starting-stage-title">从适合自己的节奏出发</h2>
                  <p>不用按年级选择，可以随时调整。</p>
                </div>
                <div className="preview-stage-options" role="group" aria-label="选择学习阶段">
                  <button type="button" className={startingStage === "starter" ? "is-selected" : ""}
                    aria-pressed={startingStage === "starter"} onClick={() => setStartingStage("starter")}>
                    <strong>小步启蒙</strong><span>每次最多 3 个词</span>
                  </button>
                  <button type="button" className={startingStage === "advanced" ? "is-selected" : ""}
                    aria-pressed={startingStage === "advanced"} onClick={() => setStartingStage("advanced")}>
                    <strong>多认识一些</strong><span>每次最多 5 个词</span>
                  </button>
                </div>
                {startingStage === "advanced" && (
                  <label className="preview-spelling-toggle">
                    <input type="checkbox" checked={spellingEnabled} onChange={(event) => setSpellingEnabled(event.target.checked)} />
                    <span><strong>试试拼写</strong><small>可选，需要输入英文；不方便输入时可以跳过。</small></span>
                  </label>
                )}
                <p className="preview-stage-note">两种节奏暂用同一组体验词，结合看图和听音练习；实际词数还受家长设置影响。</p>
              </section>
            )}
            {course.manifest.id === "primary-starter" && <PrimaryJourney profileId={activeProfileId} courseId={course.manifest.id} contentVersion={course.manifest.version}
              entries={todayEntries} onToday={() => setLesson({ id: "today", title: "今日小课", subtitle: "回顾与发现", entryIds: todayEntries.map((entry) => entry.id) })} />}
            {course.manifest.subject === "hanzi" ? (
              <HanziMap
                course={course}
                lessons={course.lessons ?? []}
                entries={courseEntries}
                exploration={exploration}
                onOpenEntry={(entry) => go({ page: "explore", courseId: course.manifest.id, view: "atlas", entryId: entry.id })}
                onStart={(next) => {
                  setHanziMode("lesson");
                  setLesson(next);
                }}
                onCoRead={(next) => {
                  setHanziMode("co-read");
                  setLesson(next);
                }}
              />
            ) : (
              <>
            <div className="preview-course-note">
              <Compass size={20} />
              <span>
                选一个感兴趣的主题，每次认识{" "}
                {course.manifest.subject === "english"
                  ? lessonPreferences.englishCount
                  : preferences.hanziCount}{" "}
                {course.manifest.subject === "english" ? "个词" : "个字"}
                。随时可以停下来。
              </span>
            </div>
            <div className="preview-lessons">
              {(course.lessons ?? []).map((l, i) => {
                const entries = l.entryIds
                  .map((id) => entriesById.get(id))
                  .filter((e): e is LearningEntry => !!e);
                return (
                  <article className="panel preview-lesson-tile" key={l.id}>
                    <Illustration
                      src={
                        entries[0] ? course.img(entries[0]) : null
                      }
                      word={l.title}
                    />
                    <div>
                      <p className="eyebrow">
                        主题 {String(i + 1).padStart(2, "0")} · {entries.length}{" "}
                        {course.manifest.subject === "english"
                          ? "个词"
                          : "个字"}
                      </p>
                      <h2>{l.title}</h2>
                      {exploration && <p>看过 {exploration.themes[i]?.viewed ?? 0} / {exploration.themes[i]?.total ?? 0} 个词</p>}
                      <p>{l.subtitle}</p>
                      <div className="preview-word-list">
                        {entries.map((e) => (
                          <button type="button" key={e.id} className="preview-entry-link" onClick={() => go({ page: "explore", courseId: course.manifest.id, view: "atlas", entryId: e.id })} aria-label={`查看 ${entryLabel(e)} 词卡`}>{entryLabel(e)}</button>
                        ))}
                      </div>
                      {course.manifest.id === "primary-starter" && entries.length > 0 && (
                        <label className="preview-start-word">
                          <span>从哪个词开始</span>
                          <select aria-label={`${l.title}起始词`} value={startingWords[l.id] ?? entries[0].id}
                            onChange={(event) => setStartingWords((current) => ({ ...current, [l.id]: event.target.value }))}>
                            {entries.map((entry) => <option key={entry.id} value={entry.id}>{entryLabel(entry)}</option>)}
                          </select>
                        </label>
                      )}
                      <button
                        className="btn btn-primary"
                        disabled={!entries.length}
                        onClick={() => setLesson(l)}
                      >
                        开始小课 <ArrowRight size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
              </>
            )}
            </>}
            <p className="preview-disclosure">
              内容为待审校草稿。
              {course.manifest.subject === "hanzi"
                ? "普通话使用设备朗读预览，也可以由家长读一读；共读只浏览，不计识别成绩。"
                : "单词播放原项目英音，例句内容待审校。"}
              {course.manifest.id === "primary-starter"
                ? "小学学习记录保存在本机。"
                : "汉字学习记录按学习者和课程保存在本机。"}
            </p>
          </div>
        )}
      </main>
      <footer className="preview-footer">
        <Logo compact />
        <span>一词一画，一起发现世界。</span>
      </footer>
      <Sheet open={!!entryId && !!course} onClose={closeEntry} label="课程条目" wide>
        {entryId && course && !entriesById.has(entryId) && <p role="alert">课程中没有找到这个条目，请返回图鉴选择。</p>}
        {entryId && course && entriesById.has(entryId) && (() => {
          const entry = entriesById.get(entryId)!;
          const text = entry.kind === "english" ? entry.word : entry.phrase;
          const example = entry.kind === "english" ? exampleTargetParts(entry.example.text, entry.example.targetForm) : null;
          return <div className="course-entry-detail">
            <Illustration src={course.img(entry)} word={entryLabel(entry)} />
            <div><p className="eyebrow">课程图鉴</p><h2>{entryLabel(entry)}</h2>
              <p>{entry.kind === "english" ? entry.meaning : entry.phrase}</p>
              <PreviewSpeak text={text} locale={entry.kind === "english" ? entry.media.locale : "zh-CN"} recording={course.audio(entry)} slow={preferences.slow} />
              {entry.kind === "english" ? <div className="preview-example"><p lang="en">{example ? <>{example[0]}<mark className="example-target">{example[1]}</mark>{example[2]}</> : entry.example.text}</p><span>{entry.example.translation}</span></div>
                : <><p>{entry.sentence}</p><details><summary>给家长的小提示</summary><p>拼音：{entry.pinyin}</p><p>{entry.caregiverTip}</p></details></>}
              <p className="preview-disclosure">内容为待审校草稿。{entry.kind === "hanzi" ? "普通话使用设备朗读，也可以请家长读一读。" : "例句和语音仍需审校。"}</p>
            </div>
          </div>;
        })()}
      </Sheet>
      <Sheet open={parentOpen} onClose={closeParent} label="家长设置">
        <div className="preview-parent">
          <p className="eyebrow">陪伴，而不催促</p>
          <h2>为 {activeProfile.nickname} 留一盏小灯</h2>
          <p>昵称和小课偏好只留在这台设备；按孩子的兴趣调整，不需要一次完成整个主题。</p>
          <section className="preview-profile" aria-labelledby="profile-title">
            <div>
              <p className="eyebrow" id="profile-title">当前学习者</p>
              <select
                aria-label="选择学习者"
                value={activeProfileId}
                onChange={(event) => profileStore.select(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nickname}
                  </option>
                ))}
              </select>
            </div>
            <label>
              昵称
              <input
                value={nicknameDraft}
                maxLength={16}
                onChange={(event) => {
                  setNicknameDraft(event.target.value);
                  setProfileMessage(null);
                }}
              />
            </label>
            <div className="preview-profile-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const result = profileStore.rename(activeProfile.id, nicknameDraft);
                  setProfileMessage(result.ok ? "昵称已保存。" : result.error);
                }}
              >
                保存昵称
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const result = profileStore.add(nicknameDraft);
                  setProfileMessage(result.ok ? `已为 ${result.profile.nickname} 新建学习空间。` : result.error);
                }}
              >
                新建学习者
              </button>
            </div>
            {profileMessage && <p className="preview-profile-message" role="status">{profileMessage}</p>}
          </section>
          <label>
            英语小课的词数
            <select
              value={primaryPreferences.englishCount}
              onChange={(e) =>
                profileStore.setCoursePreferences(activeProfile.id, "primary-starter", {
                  englishCount: Number(e.target.value) as 2 | 3 | 5,
                })
              }
            >
              <option value={2}>2 个词</option>
              <option value={3}>3 个词</option>
              <option value={5}>5 个词</option>
            </select>
          </label>
          <label>
            汉字小课的字数
            <select
              value={hanziPreferences.hanziCount}
              onChange={(e) =>
                profileStore.setCoursePreferences(activeProfile.id, "hanzi-starter", {
                  hanziCount: Number(e.target.value) as 2 | 3 | 5,
                })
              }
            >
              <option value={2}>2 个字</option>
              <option value={3}>3 个字</option>
              <option value={5}>5 个字</option>
            </select>
          </label>
          <label>
            汉字小课的时长
            <select
              value={hanziPreferences.minutes}
              onChange={(e) =>
                profileStore.setCoursePreferences(activeProfile.id, "hanzi-starter", {
                  minutes: Number(e.target.value),
                })
              }
            >
              <option value={0}>按课程默认（5 分钟）</option>
              <option value={3}>3 分钟</option>
              <option value={5}>5 分钟</option>
              <option value={8}>8 分钟</option>
            </select>
          </label>
          <label className="preview-toggle">
            <span>朗读慢一点</span>
            <input
              type="checkbox"
              checked={
                course?.manifest.id === "hanzi-starter"
                  ? hanziPreferences.slow
                  : primaryPreferences.slow
              }
              onChange={(e) =>
                profileStore.setCoursePreferences(
                  activeProfile.id,
                  course?.manifest.id === "hanzi-starter" ? "hanzi-starter" : "primary-starter",
                  { slow: e.target.checked },
                )
              }
            />
          </label>
          <p className="preview-disclosure">
            小课偏好按学习者和课程分别保存；设备主题、音效等仍是本机设备设置。这里不会改写雅思进度与旧设置。
          </p>
          <RecentActivity profileId={activeProfileId} profileName={activeProfile.nickname} />
          <FamilyCourseNote course={course} />
          <FamilyBackup />
          <button className="btn btn-primary btn-xl" onClick={closeParent}>
            设置好了 <Check size={18} />
          </button>
        </div>
      </Sheet>
      <Toasts />
    </div>
  );
}

function PreviewLesson({
  course,
  lesson,
  entries,
  preferences,
  onExit,
  onRestart,
}: {
  course: Course;
  lesson: Lesson;
  entries: LearningEntry[];
  preferences: Preferences;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [session, dispatch] = useReducer(previewReducer, undefined, () =>
    createPreviewSession(
      entries,
      course.manifest.subject === "english"
        ? preferences.englishCount
        : preferences.hanziCount,
      Date.now(),
    ),
  );
  const [exitOpen, setExitOpen] = useState(false);
  const closeExit = useCallback(() => setExitOpen(false), []);
  const step = session.steps[session.index];
  const entry = entries.find((e) => e.id === step?.entryId);
  const stats = previewStats(session);
  const result = entry ? session.results[entry.id] : undefined;
  const answered = result?.outcome === "answered";
  const intro = step?.kind === "intro";
  const imageMissing = !entry?.media.image || session.resourceFailed;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [session.index]);

  return (
    <div className="page preview-study">
      <div className="preview-study-toolbar">
        <button
          className="btn btn-ghost"
          onClick={() => (step ? setExitOpen(true) : onExit())}
        >
          <ArrowLeft size={18} />
          返回主题
        </button>
        <span>{lesson.title}</span>
        <span>
          {step
            ? `${session.index + 1} / ${session.steps.length}`
            : "这次的小发现"}
        </span>
      </div>
      <div
        className="preview-progress"
        role="progressbar"
        aria-label="小课进度"
        aria-valuenow={session.index}
        aria-valuemin={0}
        aria-valuemax={session.steps.length || 1}
      >
        <span
          style={{
            width: `${session.steps.length ? (session.index / session.steps.length) * 100 : 0}%`,
          }}
        />
      </div>
      {!step || !entry ? (
        <section className="panel preview-finish">
          <Leaf size={44} strokeWidth={1.3} />
          <p className="eyebrow">A LITTLE DISCOVERY</p>
          <h1 className="display">今天，又认识了新朋友。</h1>
          <p>一起回到生活里，找找刚才遇见的词和字吧。</p>
          <dl className="mini-stats">
            <div>
              <dt>接触过</dt>
              <dd>
                {stats.introduced}
                <small>个</small>
              </dd>
            </div>
            <div>
              <dt>独立找对</dt>
              <dd>
                {stats.independent}
                <small>个</small>
              </dd>
            </div>
            <div>
              <dt>提示或协助</dt>
              <dd>
                {stats.supported}
                <small>个</small>
              </dd>
            </div>
          </dl>
          <p className="preview-disclosure">
            {stats.skipped > 0
              ? `这次跳过了 ${stats.skipped} 个，没关系，下次再认识。`
              : "接触和找对不代表已经掌握。"}
            样板结果仅供本次体验。
          </p>
          <div className="preview-actions">
            <button className="btn btn-primary btn-xl" onClick={onExit}>
              回到主题 <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost" onClick={onRestart}>
              再体验一次
            </button>
          </div>
        </section>
      ) : (
        <>
          <header className="preview-question">
            <p className="eyebrow">
              {intro
                ? entry.kind === "english"
                  ? "先认识，再找一找"
                  : "和家长一起读一读"
                : "轮到你来找一找"}
            </p>
            <h1>
              {intro
                ? entry.kind === "english"
                  ? "看看这位新朋友"
                  : "一个字，一个小发现"
                : entry.kind === "english"
                  ? "画里藏着哪个单词？"
                  : entry.question}
            </h1>
          </header>
          <section
            className={`panel preview-study-card ${intro ? "is-intro" : "is-recall"}`}
          >
            <div
              key={`${entry.id}:${step.kind}`}
              className="preview-study-art"
              onErrorCapture={() => dispatch({ type: "resource-error" })}
            >
              <Illustration
                src={course.img(entry)}
                word={intro ? entryLabel(entry) : "图片暂未加载"}
                eager
                alt={
                  intro
                    ? entry.kind === "english"
                      ? entry.meaning
                      : entry.phrase
                    : "请根据画面选择对应的词或字"
                }
              />
              {imageMissing && (
                <p role="status">这幅图暂时没打开，可以先跳过。</p>
              )}
            </div>
            <div className="preview-study-content">
              {intro ? (
                <>
                  <h2
                    className={
                      entry.kind === "hanzi"
                        ? "preview-character"
                        : "preview-headword"
                    }
                  >
                    {entryLabel(entry)}
                  </h2>
                  <p className="preview-meaning">
                    {entry.kind === "english" ? entry.meaning : entry.phrase}
                  </p>
                  <PreviewSpeak
                    key={`${entry.id}:intro`}
                    text={entryLabel(entry)}
                    locale={entry.media.locale}
                    recording={course.audio(entry)}
                    slow={preferences.slow}
                  />
                  <div className="preview-example">
                    <p>
                      {entry.kind === "english"
                        ? entry.example.text
                        : entry.sentence}
                    </p>
                    {entry.kind === "english" && (
                      <span>{entry.example.translation}</span>
                    )}
                  </div>
                  {entry.kind === "hanzi" && (
                    <details className="preview-parent-tip">
                      <summary>给家长的小提示</summary>
                      <p>
                        {entry.pinyin} · {entry.caregiverTip}
                      </p>
                      <small>
                        普通话为设备朗读预览，无可用声音时请家长共读。
                      </small>
                    </details>
                  )}
                  <button
                    className="btn btn-primary btn-xl"
                    onClick={() => dispatch({ type: "next" })}
                  >
                    认识了，继续 <ArrowRight size={20} />
                  </button>
                </>
              ) : (
                <>
                  <p className="preview-prompt">
                    {entry.kind === "english" ? "选一张词卡" : "选一个字"}
                  </p>
                  <div
                    className={`preview-options ${entry.kind === "hanzi" ? "is-hanzi" : ""}`}
                  >
                    {step.options.map((id) => {
                      const option = entries.find((e) => e.id === id);
                      if (!option) return null;
                      return (
                        <button
                          key={id}
                          disabled={answered || imageMissing}
                          className={`preview-option ${answered && id === entry.id ? "is-answer" : ""}`}
                          onClick={() =>
                            dispatch({ type: "answer", optionId: id })
                          }
                        >
                          {entryLabel(option)}
                          {answered && id === entry.id && <Check size={20} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="preview-feedback" aria-live="polite">
                    {answered ? (
                      <>
                        <strong>
                          {result.correct ? "找到了！" : "我们再认识一下。"}
                        </strong>
                        <span>
                          {entry.kind === "english"
                            ? `${entry.word} 是${entry.meaning}。`
                            : `这是“${entry.character}”，${entry.phrase}的${entry.character}。`}
                        </span>
                        {result.support !== "independent" && (
                          <small>这次是一起找到的，不计作独立答对。</small>
                        )}
                      </>
                    ) : session.support !== "independent" ? (
                      <>
                        <strong>{entryLabel(entry)}</strong>
                        <span>
                          {session.support === "assisted"
                            ? "请家长一起找找这个新朋友。"
                            : "看看它的样子，再找一找。"}
                        </span>
                      </>
                    ) : (
                      <span>慢慢来，不计时。</span>
                    )}
                  </div>
                  {answered ? (
                    <button
                      className="btn btn-primary btn-xl"
                      onClick={() => dispatch({ type: "next" })}
                    >
                      继续 <ArrowRight size={20} />
                    </button>
                  ) : (
                    <div className="preview-support">
                      <button
                        className="btn btn-ghost"
                        disabled={imageMissing}
                        onClick={() =>
                          dispatch({ type: "support", support: "hinted" })
                        }
                      >
                        给我一点提示
                      </button>
                      <button
                        className="btn btn-ghost"
                        disabled={imageMissing}
                        onClick={() =>
                          dispatch({ type: "support", support: "assisted" })
                        }
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
              onClick={() => dispatch({ type: "skip" })}
            >
              先跳过，下次再认识 <ChevronRight size={16} />
            </button>
          )}
          <p className="preview-disclosure">
            <Volume2 size={14} />{" "}
            图片与内容为体验草稿；随时可以返回主题，刷新会结束这次体验。
          </p>
        </>
      )}
      <Sheet open={exitOpen} onClose={closeExit} label="暂时结束小课">
        <div className="preview-parent">
          <h2>先休息一下吗？</h2>
          <p>这次体验不会记录正式进度。返回主题后，下次会重新开始。</p>
          <div className="preview-actions">
            <button className="btn btn-primary" onClick={closeExit}>
              继续这次小课
            </button>
            <button className="btn btn-ghost" onClick={onExit}>
              结束体验
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
