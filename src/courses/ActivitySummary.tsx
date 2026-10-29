import { readActivityRecord, summarizeActivity, recentRecognitionDays } from "../learning/activity-record";

/** These totals describe recorded first answers, not mastered content. */
export function ActivitySummary({ profileId, courseId }: { profileId: string; courseId: string }) {
  const result = readActivityRecord(localStorage, profileId, courseId, Date.now());
  if (!result.ok) return <p role="alert">详细记录暂时无法读取，原记录已保留。</p>;
  const sessions = Object.values(result.record.sessions);
  const archived = Object.values(result.record.archivedSessions ?? {});
  if (!sessions.length && !archived.length) return <p>还没有详细活动记录。之后的小课会在这里留下记录。</p>;
  const counts = summarizeActivity(result.record);
  const recent = recentRecognitionDays(result.record, new Date());
  const olderIntro = sessions.some((session) => session.introSkipped === undefined) || archived.some((session) => !session.introHistoryKnown);
  const olderRetry = sessions.some((session) => session.retryEvents === undefined) || archived.some((session) => !session.retryHistoryKnown);
  const sinceDate = new Date(result.record.since);
  const sinceDay = `${sinceDate.getFullYear()}-${String(sinceDate.getMonth() + 1).padStart(2, "0")}-${String(sinceDate.getDate()).padStart(2, "0")}`;
  return <section aria-label="详细活动记录">
    <h3>首次答对的记录</h3>
    <p>独立答对 {counts.independent} 次 · 提示后答对 {counts.hinted} 次 · 家长一起答对 {counts.assisted} 次</p>
    {courseId === "hanzi-starter" && <p>一起共读 {counts.coReadSessions} 次</p>}
    <p>已记录：初见先跳过 {counts.introSkipped} 次 · 识别题先跳过 {counts.skipped} 次 · 识别题资源暂不可用 {counts.resourceErrors} 次</p>
    <p>已记录：重试时跳过 {counts.retrySkipped} 次 · 重试时资源暂不可用 {counts.retryResourceErrors} 次</p>
    {(olderIntro || olderRetry) && <p>部分早期会话未保存{olderIntro && olderRetry ? "初见跳过和重试" : olderIntro ? "初见跳过" : "重试"}详情，上述次数仅包含已有记录。</p>}
    {counts.retryHistoryIncomplete && <p role="status">部分较长会话的重试记录不完整，以上重试次数仅包含已保存的记录。</p>}
    <p>跳过和资源故障不算答错，也不会记入识别作答次数。</p>
    <h3>近七天识别作答</h3>
    <p>按首次识别作答日期记录，包含提示和协助，不包含跳过及资源故障；共读单独列出。</p>
    <ol className="activity-week">{recent.days.map((day) => {
      const unknown = day.key < sinceDay && day.count === 0 && day.coRead === 0;
      const label = unknown ? "暂无详细记录" : `有日期识别 ${day.count} 次${courseId === "hanzi-starter" ? `，共读 ${day.coRead} 次` : ""}`;
      return <li key={day.key}><span className="activity-week-date">{day.key.slice(5)}</span>
        <span className="activity-week-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, day.count * 10)}%` }} /></span>
        <span>{label}</span></li>;
    })}</ol>
    {recent.undated > 0 && <p>另有 {recent.undated} 次早期作答没有日期，未纳入逐日统计。</p>}
    <p>详细记录从 {new Date(result.record.since).toLocaleDateString("zh-CN")} 开始保存；之前的情况无法还原。答对次数不等于掌握数量。</p>
  </section>;
}
