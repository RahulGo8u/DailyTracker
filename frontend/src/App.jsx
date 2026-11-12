import { useCallback, useEffect, useState } from "react";
import { logout, me } from "./api";
import ActivityLog from "./components/ActivityLog";
import Categories from "./components/Categories";
import SignIn from "./components/SignIn";
import Summary from "./components/Summary";
import Tracker from "./components/Tracker";

const TABS = [
  ["tracker", "Tracker"],
  ["categories", "Categories"],
  ["log", "Activity Log"],
  ["summary", "Summary"],
];

export default function App() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("tracker");
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const loadUser = useCallback(() => {
    setError("");
    me()
      .then(setUser)
      .catch((err) => {
        setUser(null);
        if (err.status !== 401) setError(err.message);
      });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function signOut() {
    try {
      await logout();
    } catch {
      // The local screen still returns to sign-in if the server is unreachable.
    }
    setUser(null);
    setTab("tracker");
  }

  if (user === undefined) {
    return <p className="loading">Loading…</p>;
  }

  if (!user) {
    return (
      <>
        {error ? (
          <p className="error banner" role="alert">
            {error}
          </p>
        ) : null}
        <SignIn onSignedIn={setUser} />
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Daily Tracker</p>
          <strong>{user.name}</strong>
        </div>
        <button className="btn ghost" type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <main>
        {tab === "tracker" ? <Tracker revision={revision} onChange={bump} /> : null}
        {tab === "categories" ? <Categories revision={revision} onChange={bump} /> : null}
        {tab === "log" ? <ActivityLog revision={revision} onChange={bump} /> : null}
        {tab === "summary" ? <Summary revision={revision} /> : null}
      </main>
    </>
  );
}
