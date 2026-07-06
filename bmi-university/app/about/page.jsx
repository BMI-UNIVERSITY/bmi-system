import Link from "next/link";

export default function About() {
  const leadership = [
    { name: "Dr. Christopher Cookhorne", role: "President, BMI University",     img: "/images/cookhorne.png" },
    { name: "Dr. George Githinji",       role: "Vice-President, BMI University", img: "/images/george-githinji.png" },
    { name: "Dr. Joseph Kiai",           role: "Dean of Academics",              img: "/images/about-hero/about-hero-3-faculty.jpg" },
    { name: "Dr. Melba Layne",           role: "Chief Registrar",                img: "/images/melba.png" },
    { name: "Dr. Lilian Young",          role: "Dean of Students",               img: "/images/dr-young.png" },
  ];

  const trustees = [
    "Richard Lawrence — Vice Chairman",
    "Renee Wilson — Secretary",
    "Michelle Cookhorne — Treasurer",
    "Derrick Sanders",
    "David Byangu",
  ];

  const faculty = [
    "Dr. Christopher Cookhorne, Professor",
    "Dr. Melba Layne, Professor",
    "Dr. Paul, Professor",
    "Dr. Lilian Young, Professor",
    "Dr. George Githinji, Professor",
    "Dr. Joseph Kiai, Professor",
  ];

  const pillars = [
    {
      icon: "📜",
      title: "Scripture & Truth",
      body: "God, the infinite source of all things, has shown us truth through Scripture, nature, history, and above all, in Christ.",
    },
    {
      icon: "🧠",
      title: "Whole-Person Education",
      body: "Persons are spiritual, rational, moral, social, and physical — created in the image of God — able to know and value themselves, others, the universe, and God.",
    },
    {
      icon: "🌍",
      title: "Transformative Learning",
      body: "Education involves the whole person by developing the knowledge, values, and skills which enable each individual to change freely — most effectively when both instructor and student are properly related to God through Christ.",
    },
  ];

  return (
    <main id="main-content">
      {/* Page Header */}
      <header className="page-header" style={{ backgroundImage: "url('/images/about-hero/about-hero-4-community.jpg')" }}>
        <div className="page-header-content" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 2rem" }}>
          <h1>About BMI University</h1>
          <p>A legacy of Christ-centered education, faith, and global impact.</p>
        </div>
      </header>

      {/* Mission */}
      <section style={{ background: "#fff", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }} className="split-section">
          <div>
            <div className="gold-bar" />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1.5rem", lineHeight: 1.15 }}>
              Statement of Mission & Purpose
            </h2>
            <p style={{ color: "#334155", fontSize: "1.05rem", lineHeight: 1.85, marginBottom: "1.25rem" }}>
              Maintaining the vision of the founder, <strong>Dr. Christopher L. Cookhorne</strong>, BMI University develops
              Christ-centered men and women with the values, knowledge, and skills essential to impact the world.
            </p>
            <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.85, marginBottom: "1.25rem" }}>
              Through its residential and online programs, services, facilities, and collaborations, the Seminary educates
              men and women who will make important contributions to their workplaces and communities, follow their
              chosen vocations as callings to glorify God, and fulfill the Great Commission.
            </p>
            <div style={{ padding: "1.25rem 1.5rem", background: "rgba(212,175,55,0.08)", borderLeft: "4px solid #d4af37", borderRadius: "0 12px 12px 0" }}>
              <p style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.7, margin: 0 }}>
                🏅 BMI University is fully accredited by the <strong>International Association for Quality Assurance in Higher Education (QAHE)</strong>, ensuring academic integrity and exceptional student education.
              </p>
            </div>
          </div>
          <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 60px rgba(15,23,42,0.15)", aspectRatio: "4/3" }}>
            <img src="/images/about-hero/about-hero-1-team.jpg" alt="BMI University community" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </section>

      {/* Philosophy of Education */}
      <section aria-labelledby="philosophy-heading" style={{ background: "#f8fafc", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
            <h2 id="philosophy-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1rem" }}>
              Our Philosophy of Education
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: "700px", margin: "0 auto", lineHeight: 1.7 }}>
              BMI University is a distinctively Christian academic community that continues the philosophy of education
              which first gave rise to the seminary.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            {pillars.map((p, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>{p.icon}</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#0f172a", marginBottom: "1rem" }}>{p.title}</h3>
                <p style={{ color: "#64748b", lineHeight: 1.75, fontSize: "0.95rem" }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctrinal Position */}
      <section style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2744 100%)", padding: "5rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="gold-bar" style={{ margin: "0 auto 1.5rem" }} />
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "#fff", marginBottom: "1.5rem" }}>
            Doctrinal Position
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.1rem", lineHeight: 1.85 }}>
            BMI University stands firmly on the authority of Scripture and historic Christian orthodoxy. We are committed
            to equipping students with a biblical worldview that integrates faith and learning across all disciplines,
            preparing them to serve the Church and impact the world for Christ.
          </p>
        </div>
      </section>

      {/* Leadership */}
      <section aria-labelledby="leadership-heading" style={{ background: "#fff", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
            <h2 id="leadership-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1rem" }}>
              Our Leadership
            </h2>
            <blockquote style={{ color: "#64748b", fontSize: "1rem", fontStyle: "italic", maxWidth: "600px", margin: "0 auto", lineHeight: 1.8 }}>
              &ldquo;Remember your leaders, who spoke the word of God to you. Consider the outcome of their way of life and imitate their faith.&rdquo;
              <cite style={{ display: "block", marginTop: "0.5rem", fontStyle: "normal", fontWeight: 700, color: "#d4af37" }}>— Hebrews 13:7 (NIV)</cite>
            </blockquote>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            {leadership.map((l, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: "140px", height: "140px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 1.25rem", border: "4px solid #d4af37", boxShadow: "0 4px 20px rgba(212,175,55,0.25)" }}>
                  <img 
                    src={l.img} 
                    alt={l.name} 
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover", 
                      display: "block",
                      transform: l.img.includes("dr-young") ? "scaleX(-1)" : "none"
                    }} 
                    loading="lazy" 
                  />
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: "0.3rem" }}>{l.name}</h3>
                <p style={{ color: "#d4af37", fontSize: "0.85rem", fontWeight: 600 }}>{l.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty & Board */}
      <section style={{ background: "#f8fafc", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem" }} className="split-section">
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.6rem", color: "#0f172a", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "3px solid #d4af37", display: "inline-block" }}>
              Faculty
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {faculty.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#334155", fontSize: "0.95rem" }}>
                  <span style={{ width: "8px", height: "8px", background: "#d4af37", borderRadius: "50%", flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.6rem", color: "#0f172a", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "3px solid #d4af37", display: "inline-block" }}>
              Board of Trustees
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {trustees.map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#334155", fontSize: "0.95rem" }}>
                  <span style={{ width: "8px", height: "8px", background: "#0f172a", borderRadius: "50%", flexShrink: 0 }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Financial Integrity */}
      <section style={{ background: "#0f172a", padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.8rem", color: "#fff", marginBottom: "1.25rem" }}>
            Financial Integrity
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", lineHeight: 1.85, marginBottom: "2rem" }}>
            BMI College &amp; Seminary is committed to the highest standards of financial stewardship. We seek to honor
            God in fulfilling our mission as a multi-denominational educational institution training students for ministry.
            BMI C&amp;S seeks to comply with all applicable legal and regulatory requirements, including timely reporting
            to the Federal government, applicable state governments, and other regulatory bodies.
          </p>
          <a href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN" target="_blank" rel="noopener noreferrer" className="btn btn-gold">
            Give / Donate →
          </a>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .split-section { grid-template-columns: 1fr !important; gap: 2rem !important; } }
      `}</style>
    </main>
  );
}
