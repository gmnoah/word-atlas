import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Illustration } from "../ui/Illustration";

interface Entry {
  id: string; kind: "english" | "hanzi"; label: string; meaning: string; pinyin: string;
  sentence: string; translation: string; tip: string; image: string | null;
  wordAudio: string | null; sentenceAudio: string | null; imageNote: string; source: string; audioNote: string;
}
interface Catalog { title: string; subject: "english" | "hanzi"; entries: Entry[] }
const PAGE_SIZE = 20;

export function DraftReview({ subject, onBack }: { subject: "english" | "hanzi"; onBack: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null); setError(""); setSelected(null); setQuery(""); setPage(0);
    fetch(`/local/draft-review/catalog/${subject}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("未能读取本机草稿，请确认草稿与媒体清单存在。"); return response.json() as Promise<Catalog>; })
      .then((data) => { if (!Array.isArray(data.entries) || data.subject !== subject) throw new Error("草稿格式不正确。"); setCatalog(data); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "草稿暂时无法打开。"); });
    return () => controller.abort();
  }, [subject]);
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return catalog?.entries.filter((entry) => !term || [entry.label, entry.meaning, entry.sentence, entry.pinyin].some((s) => (s ?? "").toLocaleLowerCase().includes(term))) ?? [];
  }, [catalog, query]);
  const active = matches.find((entry) => entry.id === selected);
  const index = active ? matches.indexOf(active) : -1;
  const visible = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const choose = (entry: Entry) => { setSelected(entry.id); window.scrollTo({ top: 0, behavior: "auto" }); };
  return <div className="page draft-review">
    <button className="btn btn-ghost preview-back" onClick={onBack}><ArrowLeft size={18} /> 返回学习空间</button>
    <header className="draft-review-head">
      <p className="eyebrow">CONTENT REVIEW / 本机内容检查</p>
      <h1 className="display">{subject === "english" ? "基础英语 · 内容清单" : "汉字启蒙 · 内容清单"}</h1>
      <p className="lede">{catalog ? `${catalog.entries.length} ${subject === "english" ? "个词" : "个字"}，可以逐条查看。` : "正在打开本机内容…"}</p>
      <p className="draft-review-notice">这里显示当前课程的文字和图片，供你逐条检查，不计入学习进度。{subject === "hanzi" ? "汉字使用设备普通话朗读，课程没有预录音时本页不提供录音。" : "有预录音的内容可在详情中试听。"}</p>
    </header>
    {error ? <section className="panel draft-review-empty" role="alert"><h2>暂时无法打开草稿</h2><p>{error}</p><button className="btn btn-ghost" onClick={onBack}>返回学习空间</button></section> : !catalog ? <p aria-live="polite">正在读取…</p> : <>
      {active && <section className="panel draft-review-detail" aria-label={`${active.label} 的草稿详情`}>
        <Illustration key={active.id} src={active.image} word={active.label} eager alt={`${active.label} 的候选图片`} />
        <div className="draft-review-detail-body">
          <p className="eyebrow">待审核 · {index + 1} / {matches.length}</p>
          <h2 lang={active.kind === "english" ? "en" : "zh-CN"}>{active.label}</h2>
          {active.pinyin && <p className="draft-review-pinyin">{active.pinyin}</p>}
          <p className="draft-review-meaning">{active.meaning}</p>
          <div className="draft-review-example"><p>{active.sentence}</p>{active.translation && <p>{active.translation}</p>}</div>
          <p>{active.tip}</p>
          <div className="draft-review-audio" onPlay={(event) => { const current = event.target; if (current instanceof HTMLAudioElement) event.currentTarget.querySelectorAll("audio").forEach((audio) => { if (audio !== current) audio.pause(); }); }}>
            <label>词 / 字音{active.wordAudio ? <audio key={`${active.id}-word`} controls preload="none" src={active.wordAudio} /> : <span>课程暂无预录音</span>}</label>
            <label>例句朗读{active.sentenceAudio ? <audio key={`${active.id}-sentence`} controls preload="none" src={active.sentenceAudio} /> : <span>课程暂无预录音</span>}</label>
          </div>
          <details><summary>查看素材来源与审核提醒</summary><p>{active.source}</p><p>{active.imageNote}</p><p>{active.audioNote}</p></details>
          <div className="draft-review-navigation">
            <button className="btn btn-ghost" disabled={index <= 0} onClick={() => choose(matches[index - 1])}><ArrowLeft size={16} /> 上一条</button>
            <button className="btn btn-ghost" disabled={index >= matches.length - 1} onClick={() => choose(matches[index + 1])}>下一条 <ArrowRight size={16} /></button>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>返回列表</button>
          </div>
        </div>
      </section>}
      <div className="draft-review-controls">
        <label><Search size={18} /><span className="draft-review-visually-hidden">搜索草稿</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setSelected(null); }} placeholder={subject === "english" ? "搜索单词、释义或例句" : "搜索汉字、短语或拼音"} /></label>
        <span>{matches.length} 条{query ? "匹配结果" : "草稿"}</span>
      </div>
      {visible.length ? <div className="draft-review-grid">{visible.map((entry) => <button type="button" key={entry.id} className={`panel draft-review-card ${entry.id === selected ? "is-selected" : ""}`} onClick={() => choose(entry)} aria-label={`查看 ${entry.label} 草稿`}>
        <Illustration key={entry.id} src={entry.image} word={entry.label} alt="" />
        <span><strong>{entry.label}</strong><small>{entry.meaning}</small></span>
      </button>)}</div> : <p className="draft-review-empty panel">没有找到匹配的内容，试试其他词。</p>}
      {pages > 1 && <nav className="draft-review-pagination" aria-label="草稿分页">
        <button className="btn btn-ghost" disabled={page === 0} onClick={() => { setPage((n) => n - 1); setSelected(null); }}>上一页</button>
        <span>第 {page + 1} / {pages} 页</span>
        <button className="btn btn-ghost" disabled={page >= pages - 1} onClick={() => { setPage((n) => n + 1); setSelected(null); }}>下一页</button>
      </nav>}
    </>}
  </div>;
}
