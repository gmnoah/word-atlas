import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { readPrimaryProgress } from "../learning/primary-progress";
import { applyRestore, exportFullBackup, preflightRestore } from "../profiles/backup";
import { toast } from "../ui/Toast";
import { dayKey } from "../store/store";
import type { Course } from "../atlas/types";

const COURSES = [
  { id: "primary-starter", label: "基础英语" },
  { id: "hanzi-starter", label: "汉字启蒙" },
] as const;

/** Read-only family view: what was met, what is due, and what was kept. */
export function RecentActivity({ profileId, profileName }: { profileId: string; profileName: string }) {
  const rows = COURSES.map((course) => {
    const result = readPrimaryProgress(localStorage, profileId, course.id);
    if (!result.ok) return { ...course, error: true, introduced: 0, cards: 0, favorites: 0, due: 0 };
    const now = Date.now();
    const cards = Object.values(result.progress.cards);
    return {
      ...course,
      error: false,
      introduced: Object.keys(result.progress.introduced).length,
      cards: cards.length,
      favorites: result.progress.favorites.length,
      due: cards.filter((card) => card.due <= now).length,
    };
  });
  return (
    <section className="family-activity" aria-labelledby="family-activity-title">
      <p className="eyebrow" id="family-activity-title">最近的活动</p>
      <h3>{profileName} 在这台设备上的记录</h3>
      <dl>
        {rows.map((row) => (
          <div key={row.id}>
            <dt>{row.label}</dt>
            <dd>
              {row.error ? (
                <span className="family-activity-error">记录暂时无法读取，原数据已保留。</span>
              ) : (
                <>
                  <span>看过 {row.introduced} 个</span>
                  <span>有复习卡 {row.cards} 个</span>
                  <span>收藏 {row.favorites} 个</span>
                  {row.due > 0 && <span>今天到期 {row.due} 个</span>}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="family-activity-note">
        “看过”不等于已经掌握；只有独立找对才更新复习卡。这里不显示排名、连击或欠复习数量。
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
      const result = applyRestore(localStorage, checked.plan);
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
