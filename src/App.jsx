import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutFromSupabase,
  subscribeToAuthChanges,
} from "./controllers/supabaseController";
import "./App.css";

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();
const themeStorageKey = "ks-blogsite-theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return savedTheme === "dark" ? "dark" : "light";
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const session = await getCurrentSession();
        if (!active) return;
        setIsAdmin(
          Boolean(
            adminEmail &&
              session?.user.email?.toLowerCase() === adminEmail
          )
        );
      } catch (error) {
        if (active) setAuthError(error.message || "Unable to check admin access.");
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadSession();

    const unsubscribe = subscribeToAuthChanges((session) => {
      setIsAdmin(
        Boolean(adminEmail && session?.user.email?.toLowerCase() === adminEmail)
      );
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setAuthError("");

    if (!adminEmail) {
      setAuthError("Set VITE_ADMIN_EMAIL in your .env file, then restart the dev server.");
      return;
    }

    if (email.trim().toLowerCase() !== adminEmail) {
      setAuthError("This account is not allowed to manage posts.");
      return;
    }

    try {
      await signInWithPassword({
        email: email.trim(),
        password,
      });
      setPassword("");
      setSignInOpen(false);
    } catch (error) {
      setAuthError(error.message || "Unable to sign in.");
    }
  }

  async function signOut() {
    setAuthError("");
    try {
      await signOutFromSupabase();
      setSignInOpen(false);
      setPassword("");
    } catch (error) {
      setAuthError(error.message || "Unable to sign out.");
    }
  }

  return (
    <>
      <nav className="site-nav">
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/blog">Blog</Link>
        </div>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme((currentTheme) =>
                currentTheme === "light" ? "dark" : "light"
              )
            }
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "☀️" : "🌑"}
          </button>
          {authLoading ? (
            <span>Checking admin access...</span>
          ) : isAdmin ? (
            <button type="button" className="sign-out-button" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className={`sign-in-toggle${signInOpen ? " cancel-sign-in" : ""}`}
              onClick={() => {
                setSignInOpen((open) => !open);
                setAuthError("");
              }}
              aria-expanded={signInOpen}
            >
              {signInOpen ? "Cancel sign in" : "Admin sign in"}
            </button>
          )}
        </div>
      </nav>
      {signInOpen && !isAdmin && (
        <form
          onSubmit={signIn}
          className="sign-in-form"
        >
          <label className="form-field">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit">Sign in</button>
          {authError && <p role="alert" className="form-error">{authError}</p>}
        </form>
      )}
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/blog"
            element={
              <Blog key={isAdmin ? "admin" : "visitor"} isAdmin={isAdmin} />
            }
          />
        </Routes>
      </main>
    </>
  );
}