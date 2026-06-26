"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { PROGRAMS } from "@/lib/programs";

const slides = [
  { bg: "/images/home-hero/home-hero-1-graduation.jpg", tagline: "Empowering Christ-Centered Leaders" },
  { bg: "/images/home-hero/home-hero-2-students.jpg",   tagline: "Inspiring Excellence in Every Area" },
  { bg: "/images/home-hero/home-hero-3-campus.jpg",     tagline: "Transforming Lives Through Biblical Truth" },
  { bg: "/images/home-hero/home-hero-4-library.jpg",    tagline: "Developing Leaders for Global Impact" },
];

const bachelors = PROGRAMS.filter(p => p.level === 'undergraduate').map(p => ({ title: p.label, desc: p.description }));
const masters = PROGRAMS.filter(p => p.level === 'graduate').map(p => ({ title: p.label, desc: p.description }));
const doctorates = PROGRAMS.filter(p => p.level === 'doctorate').map(p => ({ title: p.label, desc: p.description }));

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState("bachelors");
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const goTo = (i) => {
    clearInterval(intervalRef.current);
    setCurrent(i);
    intervalRef.current = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 6000);
  };

  const programMap = { bachelors, masters, doctorates };

  return (
    <main id="main-content">

      {/* ── HERO ── */}
      <section aria-label="Hero" style={{ position: "relative", width: "100%", height: "100vh", minHeight: "640px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {slides.map((s, i) => (
          <div key={i} aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `url('${s.bg}')`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === current ? 1 : 0, transition: "opacity 1.4s ease-in-out" }} />
        ))}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,18,36,0.55) 0%, rgba(10,18,36,0.8) 100%)" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", padding: "0 2rem", textAlign: "center" }}>
          <div className="animate-hero">
            <span style={{ display: "inline-block", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)", color: "#d4af37", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0.45rem 1.1rem", borderRadius: "999px", marginBottom: "1.75rem" }}>
              {slides[current].tagline}
            </span>
          </div>

          <h1 className="animate-hero-delay" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(2.8rem, 6vw, 5.2rem)", color: "#fff", lineHeight: 1.1, marginBottom: "1.5rem", letterSpacing: "-0.02em", textShadow: "0 2px 24px rgba(0,0,0,0.35)" }}>
            Start Your Journey<br /><span style={{ color: "#d4af37" }}>at BMI University</span>
          </h1>

          <p className="animate-hero-delay-2" style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(1.05rem, 2vw, 1.3rem)", lineHeight: 1.75, maxWidth: "680px", margin: "0 auto 2.5rem" }}>
            Developing Christ-centered men and women with the values, knowledge, and skills essential to impact the world.
          </p>

          <div className="animate-hero-delay-2" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold">Apply Today →</a>
            <Link href="/academics" className="btn btn-outline-white">Learn More</Link>
          </div>
        </div>

        {/* Slide dots */}
        <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.6rem", zIndex: 2 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
              style={{ width: i === current ? "32px" : "10px", height: "10px", borderRadius: "999px", background: i === current ? "#d4af37" : "rgba(255,255,255,0.45)", border: "none", cursor: "pointer", transition: "all 0.35s ease", padding: 0 }} />
          ))}
        </div>
      </section>

      {/* ── MISSION STRIP ── */}
      <section style={{ background: "#0f172a", borderTop: "4px solid #d4af37", borderBottom: "4px solid #d4af37", padding: "2.5rem 2rem", textAlign: "center" }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "clamp(1rem, 2vw, 1.35rem)", color: "rgba(255,255,255,0.92)", maxWidth: "820px", margin: "0 auto", lineHeight: 1.7, letterSpacing: "0.01em" }}>
          &ldquo;Developing Christ-centered men and women with the values, knowledge, and skills essential to impact the world.&rdquo;
        </p>
      </section>

      {/* ── DEGREE PROGRAMS ── */}
      <section aria-labelledby="programs-heading" style={{ background: "#f8fafc", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
            <h2 id="programs-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 3.5vw, 3rem)", color: "#0f172a", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              Degree Programs Offered
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.1rem", maxWidth: "680px", margin: "0 auto", lineHeight: 1.7 }}>
              Choose from a full range of accredited biblical and theological programs at the bachelor&apos;s, master&apos;s, and doctoral level.
            </p>
          </div>

          {/* Tab Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "3rem", flexWrap: "wrap" }}>
            {[["bachelors", "Bachelors"], ["masters", "Masters"], ["doctorates", "Doctorate"]].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ padding: "0.7rem 2rem", borderRadius: "999px", border: "2px solid", fontWeight: 700, fontSize: "0.95rem", fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "all 0.25s ease",
                  background: activeTab === key ? "#0f172a" : "transparent",
                  color: activeTab === key ? "#fff" : "#0f172a",
                  borderColor: activeTab === key ? "#0f172a" : "#cbd5e1" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Program Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {programMap[activeTab].map((p, i) => (
              <article key={i} className="program-card" style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "transform 0.25s ease, box-shadow 0.25s ease", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ width: "40px", height: "4px", borderRadius: "999px", background: "linear-gradient(90deg, #d4af37, #b5952f)", marginBottom: "0.5rem" }} />
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", lineHeight: 1.3 }}>{p.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.7, flexGrow: 1 }}>{p.desc}</p>
                <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#d4af37", fontWeight: 700, fontSize: "0.85rem", marginTop: "0.5rem", borderBottom: "2px solid transparent", paddingBottom: "2px", width: "fit-content", transition: "border-color 0.2s" }}>
                  Apply Today →
                </a>
              </article>
            ))}
          </div>

          {/* Graduate Certificates */}
          <div style={{ marginTop: "3rem", background: "#0f172a", borderRadius: "20px", padding: "2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "2rem" }}>
            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#d4af37", marginBottom: "0.75rem" }}>Graduate Certificates</h3>
              <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>✦ Christian Studies</p>
              <p style={{ color: "rgba(255,255,255,0.7)" }}>✦ Spiritual Formation</p>
            </div>
            <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold">Apply for a Certificate →</a>
          </div>
        </div>
      </section>

      {/* ── ACCREDITATION & CTA ── */}
      <section style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2744 100%)", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }} className="split-section">
          <div>
            <div className="gold-bar" />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 3.5vw, 3rem)", color: "#fff", marginBottom: "1.5rem", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Ready to Begin Your <span style={{ color: "#d4af37" }}>Journey?</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "1rem" }}>
              BMI University is fully accredited by the International Association for Quality Assurance in Higher Education (QAHE). Our programs are designed to equip you for meaningful ministry and global impact.
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginBottom: "2.5rem", fontStyle: "italic" }}>
              Degree programs have been declared exempt from licensure requirements under North Carolina General Statutes (G.S.) 116-15(d) for religious education.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold">Apply Today →</a>
              <Link href="/admissions" className="btn btn-outline-white">View Admissions Info</Link>
            </div>
          </div>
          <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", aspectRatio: "4/3", border: "2px solid rgba(212,175,55,0.2)" }}>
            <img src="/images/admissions-hero/admissions-hero-1-students-group.jpg" alt="BMI University students" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .split-section { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  );
}
