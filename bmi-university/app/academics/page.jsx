"use client";
import Link from "next/link";
import { PROGRAMS } from "@/lib/programs";

export default function Academics() {
  const bachelors = PROGRAMS.filter(p => p.level === 'undergraduate').map(p => ({ title: p.label, desc: p.description, icon: p.icon }));
  const masters = PROGRAMS.filter(p => p.level === 'graduate').map(p => ({ title: p.label, desc: p.description, icon: p.icon }));
  const doctorates = PROGRAMS.filter(p => p.level === 'doctorate').map(p => ({ title: p.label, desc: p.description, icon: p.icon }));
  const certificates = PROGRAMS.filter(p => p.level === 'certificate').map(p => ({ title: p.label, desc: p.description, icon: p.icon }));

  const renderCards = (programs) =>
    programs.map((p, i) => (
      <article
        key={i}
        className="program-card"
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2rem",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
        }}
      >
        {p.icon && (
          <div style={{ marginBottom: "0.5rem" }}>
            <img 
              src={p.icon} 
              alt="" 
              style={{ 
                width: "48px", 
                height: "48px", 
                objectFit: "contain" 
              }} 
              loading="lazy" 
            />
          </div>
        )}
        <div style={{ width: "40px", height: "4px", borderRadius: "999px", background: "linear-gradient(90deg,#d4af37,#b5952f)" }} />
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", lineHeight: 1.3 }}>
          {p.title}
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.7, flexGrow: 1 }}>{p.desc}</p>
        <Link
          href="/apply"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#d4af37", fontWeight: 700, fontSize: "0.85rem", marginTop: "0.5rem", textDecoration: "underline", width: "fit-content" }}
        >
          Apply Today →
        </Link>
      </article>
    ));

  return (
    <main id="main-content">
      {/* Page Header */}
      <header
        className="page-header"
        style={{ backgroundImage: "url('/images/academics-hero/academics-hero-1-studying.jpg')" }}
      >
        <div className="page-header-content" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 2rem" }}>
          <h1>Academics at BMI</h1>
          <p>A Christ-centered curriculum designed to equip you for ministry and global impact.</p>
        </div>
      </header>

      {/* Intro */}
      <section style={{ background: "#fff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "880px", margin: "0 auto", textAlign: "center" }}>
          <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1.25rem" }}>
            Programs of Study
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.1rem", lineHeight: 1.8 }}>
            BMI University offers degree programs at the Bachelor&apos;s, Master&apos;s, and Doctoral level, along with
            Graduate Certificates. All programs are designed to develop Christ-centered leaders with the values,
            knowledge, and skills essential to impact the world.
          </p>
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.5rem", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", display: "inline-block" }}>
            <p style={{ color: "#0369a1", fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
              🏅 Fully accredited by QAHE — International Association for Quality Assurance in Higher Education
            </p>
          </div>
        </div>
      </section>

      {/* Bachelor's */}
      <section aria-labelledby="bachelors-heading" style={{ background: "#f8fafc", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <div style={{ width: "50px", height: "50px", background: "#0f172a", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>🎓</div>
            <div>
              <h2 id="bachelors-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: "#0f172a", lineHeight: 1.1 }}>
                Bachelor&apos;s Degrees
              </h2>
              <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Undergraduate programs grounded in Scripture and theology</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {renderCards(bachelors)}
          </div>
        </div>
      </section>

      {/* Master's */}
      <section aria-labelledby="masters-heading" style={{ background: "#fff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <div style={{ width: "50px", height: "50px", background: "#d4af37", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>📖</div>
            <div>
              <h2 id="masters-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: "#0f172a", lineHeight: 1.1 }}>
                Master&apos;s Degrees
              </h2>
              <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Advanced theological and ministry education</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {renderCards(masters)}
          </div>
        </div>
      </section>

      {/* Doctorate */}
      <section aria-labelledby="doctorate-heading" style={{ background: "#f8fafc", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <div style={{ width: "50px", height: "50px", background: "#1e293b", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>✝️</div>
            <div>
              <h2 id="doctorate-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: "#0f172a", lineHeight: 1.1 }}>
                Doctorate Programs
              </h2>
              <p style={{ color: "#64748b", marginTop: "0.25rem" }}>The highest level of theological education</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {renderCards(doctorates)}
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section aria-labelledby="certificates-heading" style={{ background: "#0f172a", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 id="certificates-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: "#fff", marginBottom: "0.75rem" }}>
              Graduate Certificates
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1rem" }}>Focused credentials for continued growth and ministry preparation</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {certificates.map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "16px", padding: "2rem" }}>
                <div style={{ width: "40px", height: "4px", background: "#d4af37", borderRadius: "999px", marginBottom: "1rem" }} />
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "#fff", fontSize: "1.1rem", marginBottom: "0.75rem" }}>{c.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "3rem" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", lineHeight: 1.7 }}>
              Degree Program(s) of study offered by BMI University have been declared by the appropriate state authority exempt from the requirements for licensure, under provisions of North Carolina General Statutes (G.S.) 116-15 (d) for exemption from licensure with respect to religious education. Exemption from licensure is not based upon any assessment of program quality under established licensing standards.
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: "1rem", padding: "1rem 2.5rem" }}>
              Apply Today →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
