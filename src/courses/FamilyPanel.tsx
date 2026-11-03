import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { readPrimaryProgress } from "../learning/primary-progress";
import { resetCourseProgress, resetAllLearningProgress } from "../learning/reset-progress";
import { applyRestoreWithLock, exportFullBackup, preflightRestore } from "../profiles/backup";
import { toast } from "../ui/Toast";
import { dayKey } from "../store/store";
import type { Course } from "../atlas/types";
import { findCourse } from "./registry";

const COURSES = [
  { id: "primary-starter", label: "基础英语" },
  { id: "middle-english", label: "初中英语" },
  { id: "hanzi-starter", label: "汉字启蒙" },
] as const;

/** Read-only family view: what was met, what is due, and what was kept. */
export function RecentActivity({ profileId, profileName, currentCourseId }: {
  profileId: string;
  profileName: string;
  currentCourseId?: string;
}) {
  const rows = COURSES.map((course) => {
    const registration = findCourse(course.id);
    const total = registration?.kind === "preview" ? registration.count : null;
    const result = readPrimaryProgress(localStorage, profileId, course.id);
    if (!result.ok) return { ...course, total, error: true, introduced: 0, cards: 0, favorites: 0, due: 0 };
    const now = Date.now();
    const cards = Object.values(result.progress.cards);
    return {
      ...course,
      total,
      error: false,
      introduced: Object.keys(result.progress.introduced).length,
      cards: cards.length,
      favorites: result.progress.favorites.length,
      due: cards.filter((card) => card.due <= now).length,
    };
  });
  return (
    <section className="family-activity" aria-labelledby="family-activity-title">
      <p className="eyebrow" id="family-activity-title">学习记录</p>
      <h2>本机学习记录</h2>
      <p className="family-activity-profile">当前学习者：{profileName}</p>
      <dl>
        {rows.map((row) => (
          <div key={row.id} className={row.id === currentCourseId ? "is-current" : undefined}>
            <dt>{row.label}{row.id === currentCourseId && <span className="family-activity-current">当前课程</span>}</dt>
            <dd>
              {row.error ? (
                <span className="family-activity-error">记录暂时无法读取，原数据已保留。</span>
              ) : (
                <>
                  <span>看过 {row.introduced}{row.total ? ` / ${row.total}` : " 个"}</span>
                  <span>有复习卡 {row.cards} 个</span>
                  <span>收藏 {row.favorites} 个</span>
                  {row.due > 0 && <span>可以回顾 {row.due} 个</span>}
                  {row.total && <progress className="family-activity-progress" value={Math.min(row.introduced, row.total)} max={row.total}
                    aria-label={`${row.label}已看过 ${row.introduced} / ${row.total}`} />}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="family-activity-note">
        “看过”和复习卡都不代表已经掌握。可计分的识别题中，独立或提示后的首次答题会更新复习卡；家长协助、跳过、拼写和照样找字不会更新。
      </p>
    </section>
  );
}

/** Whole-app backup stays available inside the family panel, not only IELTS. */
export function FamilyBackup() {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const download = () => {
    const blob = new Blob([exportFullBackup(localStorage)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `word-atlas-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const restore = async (f: File) => {
    if (f.size > 30 * 1024 * 1024) {
      toast("文件太大，不像是学习备份。", "warn");
      return;
    }
    setBusy(true);
    try {
      const checked = preflightRestore(await f.text());
      if (!checked.ok) {
        toast(checked.error, "warn");
        return;
      }
      const scope = `将替换这台设备中“词光”的全部本地档案：${checked.plan.profileCount} 位学习者、${checked.plan.courses.length} 门课程。其他网站数据不会受影响。`;
      if (!confirm(`${scope}\n\n建议先导出当前备份。确定恢复吗？`)) return;
      const result = await applyRestoreWithLock(localStorage, checked.plan);
      toast(result.ok ? "已恢复学习记录，请刷新页面继续。" : result.error, result.ok ? "ok" : "warn");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="family-backup" aria-labelledby="family-backup-title">
      <p className="eyebrow" id="family-backup-title">备份与恢复</p>
      <p>备份包含这台设备里的全部词光档案、课程设置和学习记录，不会上传。</p>
      <div className="family-backup-actions">
        <button type="button" className="btn btn-ghost" onClick={download}>
          <Download size={18} /> 导出全部档案
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => file.current?.click()}>
          <Upload size={18} /> 导入并预检
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void restore(selected).finally(() => (event.target.value = ""));
          }}
        />
      </div>
    </section>
  );
}

export function FamilyCourseNote({ course }: { course: Course | null }) {
  if (course?.manifest.subject !== "hanzi") return null;
  return (
    <p className="family-hanzi-note">
      汉字共读不要求拼音、认读速度或书写；设备没有普通话声音时，请家长直接读给孩子听。
    </p>
  );
}

/** Provides safe, explicit progress reset options inside the family settings panel. */
export function FamilyReset({
  profileId,
  profileName,
  currentCourse,
  onReset,
}: {
  profileId: string;
  profileName: string;
  currentCourse: Course | null;
  onReset?: () => void;
}) {
  const resetCurrent = () => {
    if (!currentCourse) return;
    const title = currentCourse.manifest.title;
    const ok = confirm(
      `确定清空【${profileName}】在「${title}」的学习记录吗？\n\n这会清除已学进度、小课断点和生词收藏，从头开始。建议先导出备份。`,
    );
    if (!ok) return;
    resetCourseProgress(localStorage, profileId, currentCourse.manifest.id);
    toast(`「${title}」学习记录已清空，可从头开始。`, "ok");
    onReset?.();
  };

  const resetAll = () => {
    const ok = confirm(
      `确定清空这台设备上的所有学习进度吗？\n\n将重置基础英语、初中英语、汉字启蒙及雅思的全部已学进度；学习者档案与设备外观设置将保留。\n\n此操作不可撤销，确定从头开始吗？`,
    );
    if (!ok) return;
    resetAllLearningProgress(localStorage);
    toast("全部学习记录已清空，正在重置页面…", "ok");
    onReset?.();
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <section className="family-reset" aria-labelledby="family-reset-title">
      <p className="eyebrow" id="family-reset-title">重置与从头开始</p>
      <p>重新体验时可以清空进度从第一课开始；此操作只影响本地记录，不会上传。</p>
      <div className="family-reset-actions">
        {currentCourse && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={resetCurrent}>
            <RotateCcw size={16} /> 重置「{currentCourse.manifest.title}」记录
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-danger" onClick={resetAll}>
          <Trash2 size={16} /> 清空全部课程记录
        </button>
      </div>
    </section>
  );
}
