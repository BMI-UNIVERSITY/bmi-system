"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Academics",  href: "/academics"  },
  { name: "Admissions", href: "/admissions" },
  { name: "About",      href: "/about"      },
  { name: "Contact",    href: "/contact"    },
];

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  const navBg = scrolled
    ? "shadow-lg"
    : "";

  const linkColor = "#ffffff";
  const activeLinkColor = "#d4af37";

  return (
    <>
      <header
        role="banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          zIndex: 1000,
          background: "#0f172a",
          transition: "box-shadow 0.35s ease",
        }}
        className={navBg}
      >
        <nav
          aria-label="Main navigation"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 2rem",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* ─── Logo ─── */}
          <Link
            href="/"
            aria-label="BMI University — Home"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <img
              src="/images/bmi-logo.png"
              alt="BMI University Logo"
              style={{
                height: "50px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          {/* ─── Desktop Links ─── */}
          <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }} className="desktop-nav">
            <ul
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", listStyle: "none", margin: 0, padding: 0 }}
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        display: "inline-block",
                        padding: "0.5rem 0.875rem",
                        borderRadius: "8px",
                        fontWeight: isActive ? 700 : 600,
                        fontSize: "0.95rem",
                        color: isActive ? activeLinkColor : linkColor,
                        position: "relative",
                        transition: "color 0.25s ease, background 0.25s ease",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {link.name}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            bottom: "2px",
                            left: "0.875rem",
                            right: "0.875rem",
                            height: "3px",
                            borderRadius: "999px",
                            background: "#d4af37",
                          }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <a
                href="https://bmiuniversity.org/apply/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold"
                style={{ whiteSpace: "nowrap", fontSize: "0.9rem", padding: "0.7rem 1.5rem" }}
              >
                Apply Now →
              </a>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-white"
                style={{ whiteSpace: "nowrap", fontSize: "0.9rem", padding: "0.7rem 1.5rem" }}
              >
                Give
              </a>
            </div>
          </div>

          {/* ─── Mobile Hamburger ─── */}
          <button
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: "none",
              flexDirection: "column",
              gap: "5px",
              padding: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "8px",
            }}
            className="mobile-hamburger"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "24px",
                  height: "2.5px",
                  borderRadius: "999px",
                  background: "#ffffff",
                  transition: "all 0.3s ease",
                  transform:
                    mobileOpen
                      ? i === 0 ? "rotate(45deg) translate(5px, 5px)"
                      : i === 1 ? "scaleX(0)"
                      : "rotate(-45deg) translate(5px, -5px)"
                      : "none",
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </nav>
      </header>

      {/* ─── Mobile Drawer ─── */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={mobileOpen}
        style={{
          position: "fixed",
          top: "80px",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#0f172a",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          padding: "2rem",
        }}
        className="mobile-drawer"
      >
        <ul style={{ width: "100%", maxWidth: "400px", listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.name}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "block",
                    padding: "1.1rem 1.5rem",
                    borderRadius: "12px",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: isActive ? "#d4af37" : "rgba(255,255,255,0.85)",
                    background: isActive ? "rgba(212,175,55,0.1)" : "transparent",
                    borderLeft: isActive ? "4px solid #d4af37" : "4px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
        <a
          href="https://bmiuniversity.org/apply/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-gold"
          style={{ marginTop: "2rem", width: "100%", maxWidth: "400px", fontSize: "1.1rem", padding: "1rem" }}
        >
          Apply Now →
        </a>
        <a
          href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-white"
          style={{ width: "100%", maxWidth: "400px", fontSize: "1.1rem", padding: "1rem", marginTop: "0.75rem", textAlign: "center" }}
        >
          Give / Donate
        </a>
      </div>

      {/* ─── Responsive Overrides ─── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .mobile-drawer { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-drawer { display: none !important; }
        }
      `}</style>
    </>
  );
}
