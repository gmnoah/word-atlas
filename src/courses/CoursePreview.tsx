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
import { useCallback, useEffect, useReducer, useState } from "react";
import { Illustration } from "../ui/Illustration";
import { Logo } from "../ui/Logo";
import { Sheet } from "../ui/Sheet";
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
import { courseRegistry, courseAction } from "./registry";
import {
  createPreviewSession,
  previewReducer,
  previewStats,
} from "./preview-session";
import { PreviewSpeak } from "./PreviewSpeak";
import {
  entryLabel,
  type LearningEntry,
  type Lesson,
} from "./types";
import "./preview.css";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
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
  const entryId = route.page === "explore" ? route.entryId : undefined;
  const [course, setCourse] = useState<Course | null>(null);
  const [courseEntries, setCourseEntries] = useState<LearningEntry[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [run, setRun] = useState(0);
  const [parentOpen, setParentOpen] = useState(false);
  const activeProfileId = useProfiles((snapshot) => snapshot.activeProfileId);
  const activeProfile = useProfiles(
    (snapshot) =>
      snapshot.profiles.find((profile) => profile.id === snapshot.activeProfileId) ?? snapshot.profiles[0]!,
  );
  const profiles = useProfiles((snapshot) => snapshot.profiles);
  const primaryPreferences = useProfiles((snapshot) =>
    preferencesFor(snapshot, activeProfileId, "primary-starter"),
  );
  const hanziPreferences = useProfiles((snapshot) =>
    preferencesFor(snapshot, activeProfileId, "hanzi-starter"),
  );
  const [nicknameDraft, setNicknameDraft] = useState(activeProfile.nickname);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const theme = useStore((s) => s.settings.theme);
  const preferences: Preferences =
    course?.manifest.id === "hanzi-starter" ? hanziPreferences : primaryPreferences;
  const openCourse = (id: string) => {
    const action = courseAction(id);
    if (action.kind === "preview") go({ page: "explore", courseId: action.courseId });
  };
  const closeParent = useCallback(() => setParentOpen(false), []);
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const leaveCourse = () => {
    setLesson(null);
    go({ page: "explore" });
  };
  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      setCourseEntries([]);
      setCourseError(null);
      setCourseLoading(false);
      return;
    }
    const controller = new AbortController();
    setLesson(null);
    setCourse(null);
    setCourseEntries([]);
    setCourseError(null);
    setCourseLoading(true);

    void loadCourse(courseId, { signal: controller.signal })
      .then(async (nextCourse) => {
        const ids = [...new Set(nextCourse.lessons?.flatMap((item) => item.entryIds) ?? [])];
        const entries = (await Promise.all(ids.map((id) => nextCourse.entry(id)))).filter(isLearningEntry);
        if (entryId && !entries.some((entry) => entry.id === entryId))
          throw new Error(`课程“${nextCourse.manifest.title}”中没有条目“${entryId}”。`);
        if (controller.signal.aborted) return;
        setCourse(nextCourse);
        setCourseEntries(entries);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCourseError(error instanceof Error ? error.message : "课程暂时无法打开");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCourseLoading(false);
      });
    return () => controller.abort();
  }, [courseId, entryId]);
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
        {!courseId ? (
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
                    onClick={() => openCourse("primary-starter")}
                  >
                    探索基础英语 <ArrowRight size={20} />
                  </button>
                  <button
                    className="btn btn-glass"
                    onClick={() => openCourse("hanzi-starter")}
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
                              : `${registered.count} ${registered.manifest.subject === "english" ? "个词" : "个字"} · ${registered.lessonCount} 个主题 · 内容草稿`}
                          </div>
                          {registered.kind === "legacy" ? (
                            <a className="btn btn-ghost" href={registered.href}>
                              继续雅思旅程 <ArrowRight size={17} />
                            </a>
                          ) : (
                            <button
                              className="btn btn-ghost"
                              onClick={() => openCourse(registered.manifest.id)}
                            >
                              打开图鉴 <ArrowRight size={17} />
                            </button>
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
              这是第一版体验样板，内容待教学审校；体验不记录正式学习进度，刷新后重新开始。
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
        ) : lesson ? (
          <PreviewLesson
            key={`${course.manifest.id}:${lesson.id}:${run}`}
            course={course}
            lesson={lesson}
            entries={courseEntries.filter((entry) => lesson.entryIds.includes(entry.id))}
            preferences={preferences}
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
            <div className="preview-course-note">
              <Compass size={20} />
              <span>
                选一个感兴趣的主题，每次认识{" "}
                {course.manifest.subject === "english"
                  ? preferences.englishCount
                  : preferences.hanziCount}{" "}
                {course.manifest.subject === "english" ? "个词" : "个字"}
                。随时可以停下来。
              </span>
            </div>
            <div className="preview-lessons">
              {(course.lessons ?? []).map((l, i) => {
                const entries = l.entryIds
                  .map((id) => courseEntries.find((e) => e.id === id))
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
                      <p>{l.subtitle}</p>
                      <div className="preview-word-list">
                        {entries.map((e) => (
                          <span key={e.id}>{entryLabel(e)}</span>
                        ))}
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => setLesson(l)}
                      >
                        开始小课 <ArrowRight size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="preview-disclosure">
              内容为待审校草稿。
              {course.manifest.subject === "hanzi"
                ? "普通话使用设备朗读预览，也可以由家长读一读。"
                : "单词播放原项目英音，例句为新编草稿。"}
              正式进度与复习将在后续接入。
            </p>
          </div>
        )}
      </main>
      <footer className="preview-footer">
        <Logo compact />
        <span>一词一画，一起发现世界。</span>
      </footer>
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
            小课偏好按学习者和课程分别保存；设备主题、音效等仍是本机设备设置。雅思进度与旧设置尚未迁移，T09 会先备份再处理；本次不会改写它们。
          </p>
          <button className="btn btn-primary btn-xl" onClick={closeParent}>
            设置好了 <Check size={18} />
          </button>
        </div>
      </Sheet>
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
