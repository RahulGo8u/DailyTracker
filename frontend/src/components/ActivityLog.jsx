import { useEffect, useState } from "react";
import { deleteActivity, getToday } from "../api";
import { activitySeconds, formatClock, formatDuration, todayLabel } from "../time";

export default function ActivityLog({ revision, onChange }) {
  const [activities, setActivities] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [pendingId, setPendingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    getToday()
      .then((items) => {
        if (!cancelled) {
          setActivities(items);
          setNow(Date.now());
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const running = activities.some((activity) => activity.status === "running");
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function remove(id) {
    setPendingId(id);
    setError("");
    try {
      await deleteActivity(id);
      setConfirmId(null);
      setActivities((items) => items.filter((item) => item.id !== id));
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="stack">
      <div className="section-heading">
        <h2>Today</h2>
        <p className="muted">{todayLabel()}</p>
      </div>
      {activities.length === 0 ? <p className="empty">No activities yet today.</p> : null}
      <ul className="activity-list">
        {activities.map((activity) => (
          <li key={activity.id} className="card activity-card">
            <div>
              <h3>{activity.name}</h3>
              <p className="muted">{activity.category_name}</p>
              <p className="times">
                {formatClock(activity.start_time)}
                {" – "}
                {activity.status === "running" ? "Running" : formatClock(activity.end_time)}
                <span> · {formatDuration(activitySeconds(activity, now))}</span>
              </p>
            </div>
            {confirmId === activity.id ? (
              <div className="confirm">
                <p>Delete this activity?</p>
                <button
                  className="btn danger"
                  type="button"
                  disabled={pendingId === activity.id}
                  onClick={() => remove(activity.id)}
                >
                  Delete
                </button>
                <button className="btn ghost" type="button" onClick={() => setConfirmId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn ghost" type="button" onClick={() => setConfirmId(activity.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
