import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

interface TopBarProps {
  title: string;
  /** Show the "+ Add" action on the right (admins, map screen). */
  showAdd?: boolean;
  /** If set, the left slot is a back arrow instead of the menu. */
  onBack?: () => void;
}

// Shared top bar: menu/back (left), centered title, optional "+ Add" (right).
// Phase 2 makes the (previously stub) hamburger open a real menu with the
// signed-in identity, an admin link, and log out.
export default function TopBar({ title, showAdd = false, onBack }: TopBarProps) {
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="topbar__icon-btn" aria-label="Back" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      ) : (
        <div className="topbar__menu-wrap">
          <button
            type="button"
            className="topbar__icon-btn"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="menu" role="menu">
                {profile && (
                  <div className="menu__who">
                    <span className="menu__name">{profile.full_name || 'Account'}</span>
                    <span className={`role-badge role-badge--${profile.role}`}>{profile.role}</span>
                  </div>
                )}
                <button type="button" className="menu__item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/'); }}>
                  Project map
                </button>
                {isAdmin && (
                  <button type="button" className="menu__item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}>
                    Profitability
                  </button>
                )}
                {isAdmin && (
                  <button type="button" className="menu__item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/admin/workers'); }}>
                    Manage workers
                  </button>
                )}
                <button type="button" className="menu__item menu__item--danger" role="menuitem" onClick={handleSignOut}>
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <h1 className="topbar__title">{title}</h1>

      {showAdd ? (
        <button type="button" className="topbar__add" onClick={() => navigate('/add')}>
          + Add
        </button>
      ) : (
        // Keep the title centered by reserving the right slot.
        <span className="topbar__icon-btn" aria-hidden="true" />
      )}
    </header>
  );
}
