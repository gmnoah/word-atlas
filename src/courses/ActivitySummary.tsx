import { readActivityRecord, summarizeActivity, recentRecognitionDays } from "../learning/activity-record";

/** These totals describe recorded first answers, not mastered content. */
export function ActivitySummary({ profileId, courseId }: { profileId: string; courseId: string }) {
  const result = readActivityRecord(localStorage, profileId, courseId, Date.now());
  if (!result.ok) return <p role="alert">详细记录暂时无法读取，原记录已保留。</p>;
  const sessions = Object.values(result.record.sessions);
  const archived = Object.values(result.record.archivedSessions ?? {});
  if (!sessions.length && !archived.length) return <p>还没有详细活动记录。之后的小课会在这里留下记录。</p>;
  const counts = summarizeActivity(result.record);
  const hasRecognition = counts.independent + counts.hinted + counts.assisted + counts.incorrect > 0;
  const recent = recentRecognitionDays(result.record, new Date());
  const maxDailyRecognition = Math.max(1, ...recent.days.map((day) => day.count));
  const maxDailyIntroduced = Math.max(1, ...recent.days.map((day) => day.introduced));
  const maxDailyCoRead = Math.max(1, ...recent.days.map((day) => day.coRead));
  const olderIntro = sessions.some((session) => session.introSkipped === undefined) || archived.some((session) => !session.introHistoryKnown);
  const olderRetry = sessions.some((session) => session.retryEvents === undefined) || archived.some((session) => !session.retryHistoryKnown);
  const sinceDate = new Date(result.record.since);
  const sinceDay = `${sinceDate.getFullYear()}-${String(sinceDate.getMonth() + 1).padStart(2, "0")}-${String(sinceDate.getDate()).padStart(2, "0")}`;
  return <section aria-label="详细活动记录">
    <h3>首次答对的记录</h3>
    {hasRecognition ? <div className="activity-totals" role="list" aria-label="首次答对分类">
      <span className="activity-total" role="listitem">独立答对 <strong>{counts.independent}</strong> 次</span>
      <span className="activity-total-separator" aria-hidden="true"> · </span>
      <span className="activity-total" role="listitem">提示后答对 <strong>{counts.hinted}</strong> 次</span>
      <span className="activity-total-separator" aria-hidden="true"> · </span>
      <span className="activity-total" role="listitem">家长一起答对 <strong>{counts.assisted}</strong> 次</span>
    </div> : <p>目前记录中还没有识别作答。{courseId === "hanzi-starter" ? "共读、跳过和资源故障" : "跳过和资源故障"}不会算作识别作答。</p>}
    {courseId === "hanzi-starter" && <p>一起共读 {counts.coReadSessions} 次</p>}
    <p>已记录：初见先跳过 {counts.introSkipped} 次 · 识别题先跳过 {counts.skipped} 次 · 识别题资源暂不可用 {counts.resourceErrors} 次</p>
    <p>已记录：重试时跳过 {counts.retrySkipped} 次 · 重试时资源暂不可用 {counts.retryResourceErrors} 次</p>
    {(olderIntro || olderRetry) && <p>部分早期会话未保存{olderIntro && olderRetry ? "初见跳过和重试" : olderIntro ? "初见跳过" : "重试"}详情，上述次数仅包含已有记录。</p>}
    {counts.retryHistoryIncomplete && <p role="status">部分较长会话的重试记录不完整，以上重试次数仅包含已保存的记录。</p>}
    <p>跳过和资源故障不算答错，也不会记入识别作答次数。</p>
    <h3>近七天活动</h3>
    <p>“看过”按每次小课保存的接触记录统计，同一词字在不同小课中可重复计数；识别包含首次作答、提示和协助，不包含跳过及资源故障。每种条形分别按近七天该类最多次数同比例显示。</p>
    <ul className="activity-week-legend" aria-label="图表项目">
      <li><i className="is-recognition" aria-hidden="true" />识别</li>
      <li><i className="is-introduced" aria-hidden="true" />看过</li>
      {courseId === "hanzi-starter" && <li><i className="is-co-read" aria-hidden="true" />共读</li>}
    </ul>
    <ol className="activity-week">{recent.days.map((day) => {
      const unknown = day.key < sinceDay && day.count === 0 && day.coRead === 0 && day.introduced === 0;
      const empty = day.count === 0 && day.coRead === 0 && day.introduced === 0;
      const label = unknown ? "暂无详细记录" : empty ? "当天没有记录" : `看过 ${day.introduced} · 识别 ${day.count}${courseId === "hanzi-starter" ? ` · 共读 ${day.coRead}` : ""}`;
      return <li key={day.key}><span className="activity-week-date">{day.key.slice(5)}</span>
        <span className="activity-week-bars" aria-hidden="true">
          <span className="activity-week-track"><i className="is-recognition" style={{ width: `${(day.count / maxDailyRecognition) * 100}%` }} /></span>
          <span className="activity-week-track"><i className="is-introduced" style={{ width: `${(day.introduced / maxDailyIntroduced) * 100}%` }} /></span>
          {courseId === "hanzi-starter" && <span className="activity-week-track"><i className="is-co-read" style={{ width: `${(day.coRead / maxDailyCoRead) * 100}%` }} /></span>}
        </span>
        <span className="activity-week-detail">{label}</span></li>;
    })}</ol>
    {recent.undated > 0 && <p>另有 {recent.undated} 次早期作答没有日期，未纳入逐日统计。</p>}
    {(recent.undatedIntroductions > 0 || recent.archiveIntroductionsUnknown) && <p>部分早期看过的记录没有可用日期，未纳入逐日统计。</p>}
    <p>详细记录从 {new Date(result.record.since).toLocaleDateString("zh-CN")} 开始保存；之前的情况无法还原。答对次数不等于掌握数量。</p>
  </section>;
}
