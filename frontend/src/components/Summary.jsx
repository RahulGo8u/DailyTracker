import { useEffect, useState } from "react";
import { getDailySummary, getWeeklySummary } from "../api";
import { activitySeconds, formatClock, formatDayKey, formatDuration, formatSpan, todayLabel, withLiveTime } from "../time";

export default function Summary({ revision }) {
  const [mode, setMode] = useState("daily");
  const [summary, setSummary] = useState(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setSummary(null);
    const load = mode === "daily" ? getDailySummary : getWeeklySummary;
    load()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        const stamp = Date.now();
        setReceivedAt(stamp);
        setNow(stamp);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, revision]);

  useEffect(() => {
    if (!summary?.running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [summary?.running, summary?.generated_at]);

  const extra = summary?.running ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0;
  const view = withLiveTime(summary, extra);
  const maxDay = Math.max(1, ...(view?.days || []).map((day) => day.seconds));

  return (
    <section className="stack">
      <div className="toggle" role="tablist" aria-label="Summary">
        <button type="button" aria-selected={mode === "daily"} onClick={() => setMode("daily")}>
          Daily
        </button>
        <button type="button" aria-selected={mode === "weekly"} onClick={() => setMode("weekly")}>
          Weekly
        </button>
      </div>
      {!view && !error ? <p className="muted">Loading…</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {view && mode === "daily" ? (
        <>
          <div className="section-heading">
            <h2>Today</h2>
            <p className="muted">{todayLabel()}</p>
          </div>
          <Stats summary={view} now={now} />
        </>
      ) : null}
      {view && mode === "weekly" ? (
        <>
          <div className="section-heading">
            <h2>This week</h2>
            <p className="muted">
              {formatDayKey(view.week_start)} – {formatDayKey(view.week_end)}
            </p>
          </div>
          <div className="stat-row">
            <article className="card stat">
              <p className="muted">Total</p>
              <strong>{formatSpan(view.total_seconds)}</strong>
            </article>
          </div>
          <section className="card">
            <h3>Days</h3>
            <ul className="bars">
              {view.days.map((day) => (
                <li key={day.date}>
                  <span>{day.label}</span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${(day.seconds / maxDay) * 100}%` }} />
                  </span>
                  <span className="bar-value">{formatSpan(day.seconds)}</span>
                </li>
              ))}
            </ul>
          </section>
          <CategoryBreakdown rows={view.by_category} total={view.total_seconds} />
        </>
      ) : null}
    </section>
  );
}

function Stats({ summary, now }) {
  return (
    <>
      <div className="stat-row">
        <article className="card stat">
          <p className="muted">Total</p>
          <strong>{formatSpan(summary.total_seconds)}</strong>
        </article>
        <article className="card stat">
          <p className="muted">Activities</p>
          <strong>{summary.activity_count}</strong>
        </article>
      </div>
      <CategoryBreakdown rows={summary.by_category} total={summary.total_seconds} />
      <section className="card">
        <h3>Activities</h3>
        {summary.activities.length === 0 ? <p className="empty">No activities yet today.</p> : null}
        <ul className="plain-list">
          {summary.activities.map((activity) => (
            <li key={activity.id}>
              <div>
                <span>{activity.name}</span>
                <span className="muted">
                  {activity.category_name}
                  {" · "}
                  {formatClock(activity.start_time)}
                  {activity.end_time ? ` – ${formatClock(activity.end_time)}` : " – Running"}
                </span>
              </div>
              <span className="bar-value">
                {activity.status === "running"
                  ? formatDuration(activitySeconds(activity, now))
                  : formatSpan(activity.duration_seconds)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function CategoryBreakdown({ rows, total }) {
  if (!rows.length) {
    return (
      <section className="card">
        <h3>Categories</h3>
        <p className="empty">No time recorded yet.</p>
      </section>
    );
  }
  return (
    <section className="card">
      <h3>Categories</h3>
      <ul className="bars">
        {rows.map((row) => (
          <li key={row.category_id}>
            <span>{row.category_name}</span>
            <span className="bar" aria-hidden="true">
              <span style={{ width: `${total ? (row.seconds / total) * 100 : 0}%` }} />
            </span>
            <span className="bar-value">{formatSpan(row.seconds)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
