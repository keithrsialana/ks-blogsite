import { useState } from "react";
import { Link } from "react-router-dom";

// Name: SiteNavigation
// Parameters:
//     theme - Current color theme.
//     onThemeToggle - Toggles the theme.
//     authLoading - Whether authentication is loading.
//     isAdmin - Whether the current user is an admin.
//     onSignOut - Signs out the admin.
//     signInOpen - Whether the sign-in form is open.
//     onSignInToggle - Toggles the sign-in form.
//     email - Sign-in email value.
//     onEmailChange - Updates the email value.
//     password - Sign-in password value.
//     onPasswordChange - Updates the password value.
//     onSignIn - Submits sign-in credentials.
//     authError - Sign-in error message.
// Description: Renders site navigation, theme controls, and admin sign-in controls.
// Author: Keith Sialana
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Name: closeMenu
  // Parameters:
  //     None - This function takes no parameters.
  // Description: Closes the responsive navigation menu.
  // Author: Keith Sialana
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="site-nav">
        <button
          type="button"
          className="nav-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="site-navigation-menu"
        >
          <span className="nav-menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div
          id="site-navigation-menu"
          className={`site-nav-menu${menuOpen ? " is-open" : ""}`}
        >
          <div className="nav-links">
            <Link to="/" onClick={closeMenu}>Home</Link>
            <Link to="/blog" onClick={closeMenu}>Blog</Link>
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
