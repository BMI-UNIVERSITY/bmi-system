"use client";

import { useState } from "react";
import Link from "next/link";

const quickLinks = [
  { label: "Academics",  href: "/academics"  },
  { label: "Admissions", href: "/admissions" },
  { label: "About Us",   href: "/about"      },
  { label: "Contact",    href: "/contact"    },
  { label: "Accreditation", href: "/accreditation" },
  { label: "Apply Now",  href: "https://bmiuniversity.org/apply/", external: true },
];

const programCategories = [
  { label: "Bachelor's Degrees",    href: "/academics#undergraduate" },
  { label: "Master's Degrees",      href: "/academics#graduate"      },
  { label: "Doctorate",             href: "/academics#doctorate"     },
  { label: "Graduate Certificates", href: "/academics#certificate"   },
];

const FacebookIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
  </svg>
);

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer style={{ background: "#0a1628", color: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Gold accent top border ── */}
      <div style={{ height: "4px", background: "linear-gradient(90deg, #d4af37 0%, #f5d76e 50%, #d4af37 100%)" }} />

      {/* ── Main grid ── */}
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "64px 32px 48px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "48px",
      }}
        className="footer-grid"
      >

        {/* Column 1 — Brand */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link href="/" aria-label="BMI University — Home" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/images/bmi-logo.png" alt="BMI University Logo" style={{ height: "50px", width: "auto", objectFit: "contain" }} />
          </Link>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>
            Developing Christ-centered men and women with the values, knowledge, and skills essential to impact the world.
          </p>

          <Link href="/accreditation" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#d4af37", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>
            🏅 Accredited by QAHE
          </Link>

          {/* Social icons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {[
              { label: "Facebook", icon: <FacebookIcon /> },
              { label: "YouTube",  icon: <YouTubeIcon /> },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                style={{
                  width: "38px", height: "38px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s, color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#d4af37"; e.currentTarget.style.color = "#0a1628"; e.currentTarget.style.borderColor = "#d4af37"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Column 2 — Quick Links */}
        <nav aria-label="Footer quick links">
          <h3 style={{ color: "#d4af37", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            Quick Links
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {quickLinks.map((l) => (
              <li key={l.label}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} style={linkStyle}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Column 3 — Programs */}
        <nav aria-label="Footer programs">
          <h3 style={{ color: "#d4af37", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            Programs
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {programCategories.map((p) => (
              <li key={p.label}>
                <Link href={p.href} style={linkStyle}>{p.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Column 4 — Contact */}
        <address style={{ fontStyle: "normal" }}>
          <h3 style={{ color: "#d4af37", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            Contact Us
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { label: "US Branch", value: "704-607-5540", href: "tel:+17046075540", icon: "📍" },
              { label: "East Africa Branch", value: "+254-726-912577", href: "tel:+254726912577", icon: "🌍" },
              { label: "Email", value: "admin@bmiuniversity.org", href: "mailto:admin@bmiuniversity.org", icon: "✉️" },
            ].map((c) => (
              <div key={c.label} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.95rem", marginTop: "2px" }}>{c.icon}</span>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>
                    {c.label}
                  </div>
                  <a href={c.href} style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#d4af37"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                  >
                    {c.value}
                  </a>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.95rem", marginTop: "2px" }}>❤️</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Give / Donate</div>
                <a href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#d4af37", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
                  Donate via PayPal →
                </a>
              </div>
            </div>
          </div>
        </address>
      </div>

      {/* ── Newsletter bar ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#fff" }}>Stay Connected with BMI University</p>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>Get news, events, and updates from our global community.</p>
          </div>
          {subscribed ? (
            <p style={{ color: "#d4af37", fontWeight: 700 }}>✓ Subscribed! Welcome to the BMI family.</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email" type="email" required
                placeholder="Your email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "10px 18px", borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#fff", fontSize: "0.875rem",
                  outline: "none", minWidth: "260px",
                }}
              />
              <button type="submit" style={{
                padding: "10px 24px", borderRadius: "8px",
                background: "#d4af37", color: "#0a1628",
                fontWeight: 700, fontSize: "0.875rem",
                border: "none", cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
        <div style={{
          maxWidth: "1280px", margin: "0 auto",
          padding: "18px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap"
        }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}>
            © {new Date().getFullYear()} BMI University. All Rights Reserved.
          </p>
          <div style={{ display: "flex", gap: "24px" }}>
            {[
              { label: "Privacy Policy", href: "/privacy" },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
              >{l.label}</Link>
            ))}
            {["Terms of Service", "Accessibility"].map((t) => (
              <button key={t} type="button"
                style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
              >{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        .footer-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}

const linkStyle = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "0.875rem",
  textDecoration: "none",
  transition: "color 0.2s",
  display: "inline-block",
};
