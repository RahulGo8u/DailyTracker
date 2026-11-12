import { useEffect, useState } from "react";
import { createCategory, getCategories, renameCategory } from "../api";

export default function Categories({ revision, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    getCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  async function addCategory(event) {
    event.preventDefault();
    const next = name.trim();
    if (!next) return;
    setPending(true);
    setError("");
    try {
      await createCategory(next);
      setName("");
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function saveRename(event) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || !editingId) return;
    setPending(true);
    setError("");
    try {
      await renameCategory(editingId, next);
      setEditingId(null);
      setDraft("");
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <div className="card-heading">
        <h2>Categories</h2>
      </div>
      <ul className="category-list">
        {categories.map((category) => (
          <li key={category.id}>
            {editingId === category.id ? (
              <form className="inline-form" onSubmit={saveRename}>
                <input
                  aria-label={`New name for ${category.name}`}
                  value={draft}
                  maxLength={50}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button className="btn primary" type="submit" disabled={pending || !draft.trim()}>
                  Save
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft("");
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="category-row">
                <span>{category.name}</span>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setEditingId(category.id);
                    setDraft(category.name);
                    setError("");
                  }}
                >
                  Rename
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={addCategory}>
        <input
          aria-label="New category"
          placeholder="New category"
          value={name}
          maxLength={50}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn primary" type="submit" disabled={pending || !name.trim()}>
          Add
        </button>
      </form>
      {loadError || error ? (
        <p className="error" role="alert">
          {loadError || error}
        </p>
      ) : null}
    </section>
  );
}
