import { useEffect, useRef, useState } from "react";
import { login } from "../api";

export default function SignIn({ onSignedIn }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured.");
      return undefined;
    }

    let cancelled = false;
    const existing = document.querySelector("script[data-gis]");
    const script = existing || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.gis = "true";

    const render = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            setError("");
            onSignedIn(await login(response.credential));
          } catch (err) {
            setError(err.message);
          }
        },
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 280,
        text: "signin_with",
      });
    };

    script.onerror = () => {
      if (!cancelled) setError("Could not load Google sign-in.");
    };
    script.addEventListener("load", render);
    if (window.google?.accounts?.id) render();
    if (!existing) document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", render);
    };
  }, [onSignedIn]);

  return (
    <main className="signin">
      <section className="card signin-card">
        <p className="eyebrow">Daily Tracker</p>
        <h1>Record what you are doing.</h1>
        <p className="muted">Sign in with Gmail. There is no separate password.</p>
        <div ref={buttonRef} className="google-button" />
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
