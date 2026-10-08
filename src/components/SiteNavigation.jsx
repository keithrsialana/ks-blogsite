import { Link } from "react-router-dom";

export default function SiteNavigation({
  theme,
  onThemeToggle,
  authLoading,
  isAdmin,
  onSignOut,
  signInOpen,
  onSignInToggle,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSignIn,
  authError,
}) {
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
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "☀️" : "🌑"}
          </button>
          {authLoading ? (
            <span>Checking admin access...</span>
          ) : isAdmin ? (
            <button type="button" className="sign-out-button" onClick={onSignOut}>
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className={`sign-in-toggle${signInOpen ? " cancel-sign-in" : ""}`}
              onClick={onSignInToggle}
              aria-expanded={signInOpen}
            >
              {signInOpen ? "Cancel sign in" : "Admin sign in"}
            </button>
          )}
        </div>
      </nav>
      {signInOpen && !isAdmin && (
        <form onSubmit={onSignIn} className="sign-in-form">
          <label className="form-field">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
            />
          </label>
          <button type="submit">Sign in</button>
          {authError && <p role="alert" className="form-error">{authError}</p>}
        </form>
      )}
    </>
  );
}
