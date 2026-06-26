"use client";

import { useState } from "react";
import Link from "next/link";
import { PROGRAMS } from "@/lib/programs";

const quickLinks = [
  { label: "Academics",  href: "/academics"  },
  { label: "Admissions", href: "/admissions" },
  { label: "About Us",   href: "/about"      },
  { label: "Contact",    href: "/contact"    },
  { label: "Apply Now",  href: "https://bmiuniversity.org/apply/", external: true },
];

const programs = {
  "Bachelor's Degrees": PROGRAMS.filter(p => p.level === 'undergraduate').map(p => p.label),
  "Master's Degrees": PROGRAMS.filter(p => p.level === 'graduate').map(p => p.label),
  Doctorate: PROGRAMS.filter(p => p.level === 'doctorate').map(p => p.label),
  "Graduate Certificates": PROGRAMS.filter(p => p.level === 'certificate').map(p => p.label),
};

const socialLinks = [
  {
    label: "Facebook",
    type: "button",
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    type: "button",
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [email, setEmail]         = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer style={{ background: "linear-gradient(180deg,#0c1628 0%,#0f172a 100%)", borderTop: "5px solid #d4af37", color: "#fff" }}>

      {/* ── Top: Newsletter ── */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "3rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ maxWidth: "500px" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#fff", marginBottom: "0.4rem" }}>
              Stay Connected with BMI University
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>
              Get news, events, and updates from our growing global community.
            </p>
          </div>
          {subscribed ? (
            <p style={{ color: "#d4af37", fontWeight: 700 }}>✅ You&apos;re subscribed! Welcome to the BMI family.</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <label htmlFor="footer-email" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Email</label>
              <input
                id="footer-email" type="email" required
                placeholder="Your email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ padding: "0.8rem 1.25rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "0.9rem", minWidth: "260px", outline: "none" }}
              />
              <button type="submit" className="btn btn-gold" style={{ fontSize: "0.9rem", padding: "0.8rem 1.5rem" }}>Subscribe</button>
            </form>
          )}
        </div>
      </div>

      {/* ── Main Footer ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "4rem 2rem 3rem", display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1.4fr 1.2fr", gap: "3rem" }} className="footer-main-grid">

        {/* Brand */}
        <div>
          <Link
            href="/"
            aria-label="BMI University — Home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              marginBottom: "1.5rem"
            }}
          >
            <img
              src="/images/bmi-crest-270.png"
              alt="BMI University Crest"
              style={{
                height: "60px",
                width: "auto",
                objectFit: "contain",
              }}
            />
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: "1.25rem",
              color: "#ffffff",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}>
              BMI<br />
              <span style={{ color: "#d4af37", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>University</span>
            </span>
          </Link>
          <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.75, marginBottom: "0.75rem", fontSize: "0.88rem", maxWidth: "320px" }}>
            Developing Christ-centered men and women with the values, knowledge, and skills essential to impact the world.
          </p>
          <Link href="/accreditation" style={{ display: "inline-block", color: "#d4af37", fontSize: "0.8rem", fontWeight: 700, marginBottom: "1.75rem", textDecoration: "none", transition: "opacity 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            🏅 Accredited by QAHE →
          </Link>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {socialLinks.map((s) => (
              <button key={s.label} type="button" aria-label={s.label}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", transition: "all 0.25s ease", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#d4af37"; e.currentTarget.style.color = "#0f172a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <nav aria-label="Footer quick links">
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4af37", marginBottom: "1.5rem" }}>
            Quick Links
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {quickLinks.map((l) => (
              <li key={l.label}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", transition: "color 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href}
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", transition: "color 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Programs */}
        <nav aria-label="Footer programs">
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4af37", marginBottom: "1.5rem" }}>
            Programs
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {Object.entries(programs).map(([level, list]) => (
              <div key={level}>
                <a href="/academics" style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem", display: "block", marginBottom: "0.4rem" }}>{level}</a>
                {list.map((p) => (
                  <div key={p} style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", lineHeight: 1.9, paddingLeft: "0.5rem" }}>
                    · {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Contact */}
        <address style={{ fontStyle: "normal" }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4af37", marginBottom: "1.5rem" }}>
            Contact Us
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>🇺🇸</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>US Branch</div>
                <a href="tel:+17046075540" style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", fontWeight: 600, transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}>
                  704-607-5540
                </a>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>🌍</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>East Africa Branch</div>
                <a href="tel:+254726912577" style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", fontWeight: 600, transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}>
                  +254-726-912577
                </a>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>✉️</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>Email</div>
                <a href="mailto:admin@bmiuniversity.org" style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}>
                  admin@bmiuniversity.org
                </a>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>🙏</span>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>Give / Donate</div>
                <a href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#d4af37", fontSize: "0.88rem", fontWeight: 700, transition: "opacity 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
                  Click here to give →
                </a>
              </div>
            </div>
          </div>
        </address>
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
            &copy; {new Date().getFullYear()} BMI University. All Rights Reserved.
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
              Privacy Policy
            </Link>
            {["Terms of Service", "Accessibility"].map((item) => (
              <button key={item} type="button"
                style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", transition: "color 0.2s", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .footer-main-grid { grid-template-columns: 1.8fr 0.9fr 1.4fr 1.2fr; }
        @media (max-width: 1100px) { .footer-main-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px)  { .footer-main-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
