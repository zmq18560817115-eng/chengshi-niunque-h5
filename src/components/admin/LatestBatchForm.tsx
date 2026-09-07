"use client";

import { useActionState, useState } from "react";
import { publishLatestBatchAction } from "@/app/admin/actions";
import { formatInspectionDate, type LatestBatch } from "@/config/h5-latest-batch";

export function LatestBatchForm({ initialValue }: { initialValue: LatestBatch }) {
  const [state, action, pending] = useActionState(publishLatestBatchAction, {});
  const [draft, setDraft] = useState(initialValue);
  const published = state.value ?? initialValue;
  return <section className="admin-section">
    <h2>最新公开批次</h2>
    <p>修改首页“最新公开批次”下方的批次号和检测日期，保存后立即公开展示。</p>
    <form action={action} className="admin-form">
      <label>正装批次号<input name="regularBatch" value={draft.regularBatch} onChange={(event) => setDraft({ ...draft, regularBatch: event.target.value })} disabled={pending} maxLength={24} required autoComplete="off" spellCheck={false}/></label>
      <label>试用装批次号<input name="trialBatch" value={draft.trialBatch} onChange={(event) => setDraft({ ...draft, trialBatch: event.target.value })} disabled={pending} maxLength={24} required autoComplete="off" spellCheck={false}/></label>
      <label>检测日期<span>按月填写 2026-08，或按具体日期填写 2026-08-15。</span><input name="inspectionDate" value={draft.inspectionDate} onChange={(event) => setDraft({ ...draft, inspectionDate: event.target.value })} disabled={pending} maxLength={10} placeholder="YYYY-MM 或 YYYY-MM-DD" required autoComplete="off"/></label>
      {state.error && <p role="alert">{state.error}</p>}
      {state.saved && JSON.stringify(draft) === JSON.stringify(state.value) && <p role="status">已保存并发布，首页批次信息已更新。</p>}
      <button className="button button-primary" disabled={pending}>{pending ? "正在发布…" : "保存并发布"}</button>
    </form>
    <p>当前公开内容：正装 {published.regularBatch} · 试用装 {published.trialBatch} · {formatInspectionDate(published.inspectionDate)}</p>
  </section>;
}
