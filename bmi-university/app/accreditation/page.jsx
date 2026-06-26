export default function AccreditationPage() {
  return (
    <main id="main-content" style={{ background: "#f8fafc", minHeight: "100vh", padding: "6rem 2rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 4vw, 3.2rem)", color: "#0f172a", marginBottom: "1.5rem" }}>
          Accreditation & Authorization
        </h1>
        <div className="gold-bar" style={{ marginBottom: "2.5rem" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          <section style={{ background: "#fff", padding: "2.5rem", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>QAHE Accreditation</h2>
            <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "1rem" }}>
              BMI University is fully accredited by the <strong>International Association for Quality Assurance in Pre-Tertiary and Higher Education (QAHE)</strong>. QAHE is an independent, private international accrediting agency that recognizes educational institutions for their commitment to maintaining high standards of academic quality and operational integrity.
            </p>
            <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.8 }}>
              This accreditation underscores our dedication to providing a rigorous, faith-based education that equips students for global ministry and leadership.
            </p>
            <button type="button" style={{ display: "inline-block", marginTop: "1.5rem", color: "#d4af37", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid #d4af37", paddingBottom: "2px", background: "transparent", borderLeft: "none", borderRight: "none", borderTop: "none", cursor: "pointer" }}>
              Verify QAHE Accreditation →
            </button>
          </section>

          <section style={{ background: "#fff", padding: "2.5rem", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>U.S. Recognition Status</h2>
            <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "1rem" }}>
              Please note that QAHE is an independent international accrediting body and is <strong>not</strong> recognized by the United States Department of Education (USDE) or the Council for Higher Education Accreditation (CHEA).
            </p>
            <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.8 }}>
              Prospective students should verify with receiving institutions or potential employers whether degrees issued under QAHE accreditation and religious exemption will satisfy specific transfer credit, professional licensure, or employment requirements.
            </p>
          </section>

          <section style={{ background: "#fff", padding: "2.5rem", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>State Licensure Exemption</h2>
            <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.8 }}>
              Degree programs of study offered by BMI University have been declared exempt from the requirements for licensure under provisions of North Carolina General Statutes Section (G.S.) 116-15(d) for exemption from licensure with respect to religious education. Exemption from licensure is not based upon any assessment of program quality under established licensing standards.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
