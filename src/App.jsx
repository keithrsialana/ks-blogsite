import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import SiteFooter from "./components/SiteFooter";
import SiteNavigation from "./components/SiteNavigation";
import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutFromSupabase,
  subscribeToAuthChanges,
} from "./controllers/supabaseController";
import "./App.css";

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();
const themeStorageKey = "ks-blogsite-theme";

// Name: App
// Parameters:
//     None - This component takes no parameters.
// Description: Renders the application shell and manages theme and admin authentication state.
// Author: Keith Sialana
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

    // Name: loadSession
    // Parameters:
    //     None - This function takes no parameters.
    // Description: Loads the current Supabase session and determines admin access.
    // Author: Keith Sialana
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

  // Name: signIn
  // Parameters:
  //     event - The sign-in form submission event.
  // Description: Validates the configured admin email and signs in with Supabase credentials.
  // Author: Keith Sialana
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

  // Name: signOut
  // Parameters:
  //     None - This function takes no parameters.
  // Description: Signs out the current Supabase user and clears sign-in state.
  // Author: Keith Sialana
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
    <div className="app-layout">
      <SiteNavigation
        theme={theme}
        onThemeToggle={() =>
          setTheme((currentTheme) =>
            currentTheme === "light" ? "dark" : "light"
          )
        }
        authLoading={authLoading}
        isAdmin={isAdmin}
        onSignOut={signOut}
        signInOpen={signInOpen}
        onSignInToggle={() => {
          setSignInOpen((open) => !open);
          setAuthError("");
        }}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        onSignIn={signIn}
        authError={authError}
      />
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
      <SiteFooter />
    </div>
  );
}