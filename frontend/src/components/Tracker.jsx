import { useEffect, useState } from "react";
import { getCategories, getCurrentActivity, startActivity, stopActivity } from "../api";
import { formatDuration } from "../time";

export default function Tracker({ revision, onChange }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [current, setCurrent] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadCurrent() {
    setCurrent(await getCurrentActivity());
    setNow(Date.now());
  }

  useEffect(() => {
    let cancelled = false;
    setError("");
    Promise.all([getCategories(), getCurrentActivity()])
      .then(([items, running]) => {
        if (cancelled) return;
        setCategories(items);
        setCategoryId((selected) =>
          items.some((item) => item.id === selected) ? selected : items[0]?.id || "",
        );
        setCurrent(running);
        setNow(Date.now());
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  useEffect(() => {
    if (current?.status !== "running") return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [current?.status, current?.id]);

  async function start(event) {
    event.preventDefault();
    if (!name.trim() || !categoryId) return;
    setPending(true);
    setError("");
    try {
      const started = await startActivity(categoryId, name.trim());
      setCurrent(started);
      setName("");
      setNow(Date.now());
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function stop() {
    setPending(true);
    setError("");
    try {
      await stopActivity();
      setCurrent(null);
      onChange();
    } catch (err) {
      setError(err.message);
      await loadCurrent().catch(() => {});
    } finally {
      setPending(false);
    }
  }

  const elapsed = current
    ? Math.max(0, Math.floor((now - new Date(current.start_time).getTime()) / 1000))
    : 0;

  return (
    <div className="stack">
      <section className="card">
        <div className="card-heading">
          <h2>Start</h2>
        </div>
        <form className="stack" onSubmit={start}>
          <label>
            Category
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Activity
            <input
              value={name}
              maxLength={200}
              placeholder="What are you doing?"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="btn primary large" type="submit" disabled={pending || !name.trim() || !categoryId}>
            Start
          </button>
          {current ? <p className="muted">Starting a new activity stops the current one.</p> : null}
        </form>
      </section>

      <section className="card timer-card">
        {current ? (
          <>
            <p className="eyebrow">
              <span className="dot" aria-hidden="true" /> Running
            </p>
            <h2>{current.name}</h2>
            <p className="muted">{current.category_name}</p>
            <p className="timer">{formatDuration(elapsed)}</p>
            <button className="btn danger large" type="button" onClick={stop} disabled={pending}>
              Stop
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Running</p>
            <h2>Nothing running</h2>
            <p className="muted">Start an activity and the timer stays with you if you refresh.</p>
          </>
        )}
      </section>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
