import Link from "next/link";

export default function Admissions() {
  const fees = [
    { label: "Application Fee (Non-refundable)", amount: "$50.00" },
    { label: "Registration Fee (Non-refundable)", amount: "$50.00" },
    { label: "Graduation Fee", amount: "$150.00" },
    { label: "Thesis Fee", amount: "$300.00" },
    { label: "Dissertation Fee", amount: "$400.00" },
    { label: "Audit Fee", amount: "$100.00 / course" },
    { label: "Life Learning Credit Assessment", amount: "$70.00 / credit hour" },
  ];

  const transferFees = [
    { credits: "Less than 30 credits", fee: "$50.00" },
    { credits: "30 to 60 credits", fee: "$100.00" },
    { credits: "61 to 90 credits", fee: "$150.00" },
    { credits: "More than 90 credits", fee: "$200.00" },
  ];

  const tuitionRates = [
    { program: "Undergraduate / Bachelor's Degrees", cost: "$250.00 / credit hour" },
    { program: "Graduate / Master's Degrees", cost: "$350.00 / credit hour" },
    { program: "Doctorate Degrees", cost: "$450.00 / credit hour" },
    { program: "Graduate Certificates", cost: "$300.00 / credit hour" },
  ];

  const steps = [
    { num: "01", title: "Create Your Account", body: "Fill out the initial form at /apply to create your applicant account. You will receive a verification email to confirm your email address." },
    { num: "02", title: "Complete the Application", body: "Log into the applicant portal and complete the multi-step application form, including program selection, educational background, and personal statement." },
    { num: "03", title: "Submit Transcripts & Documents", body: "Upload transcripts from all colleges and universities attended, along with ID documents and any additional materials through the secure applicant portal." },
    { num: "04", title: "Request Recommendations", body: "Use the portal to send secure recommendation requests to your referees. They will receive a unique link to upload their letters directly." },
    { num: "05", title: "Pay Application Fee", body: "Submit the non-refundable Application Fee of $50.00 to finalize your submission. Your application is not complete until the fee is paid." },
  ];

  return (
    <main id="main-content">
      <header className="page-header" style={{ backgroundImage: "url('/images/admissions-hero/admissions-hero-3-orientation.jpg')" }}>
        <div className="page-header-content" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 2rem" }}>
          <h1>Admissions</h1>
          <p>Your journey toward Christ-centered leadership begins here.</p>
        </div>
      </header>

      <section style={{ background: "#fff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }} className="split-section">
          <div>
            <div className="gold-bar" />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1.5rem", lineHeight: 1.15 }}>
              Ready to Begin<br />Your Journey?
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", lineHeight: 1.85, marginBottom: "1.5rem" }}>
              BMI University welcomes applicants who are called to serve Christ and His Church. Whether you are pursuing
              a Bachelor&apos;s, Master&apos;s, or Doctoral degree, our admissions process is designed to be straightforward
              and supportive.
            </p>
            <Link href="/apply" className="btn btn-gold" style={{ fontSize: "1rem" }}>
              Apply Now →
            </Link>
          </div>
          <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 60px rgba(15,23,42,0.15)", aspectRatio: "4/3" }}>
            <img src="/images/admissions-hero/admissions-hero-2-interview.jpg" alt="Admissions process at BMI University" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </section>

      <section aria-labelledby="requirements-heading" style={{ background: "#f8fafc", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
            <h2 id="requirements-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1rem" }}>
              Admission Steps
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: "640px", margin: "0 auto", lineHeight: 1.7 }}>
              Follow these steps to complete your application to BMI University. You can track your progress through the online portal.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            {steps.map((s) => (
              <div key={s.num} style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "4rem", color: "rgba(212,175,55,0.1)", position: "absolute", top: "1rem", right: "1.5rem", lineHeight: 1 }}>
                  {s.num}
                </div>
                <div style={{ width: "48px", height: "48px", background: "linear-gradient(135deg,#d4af37,#b5952f)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "#0f172a", marginBottom: "1.25rem" }}>
                  {s.num}
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: "0.75rem" }}>{s.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.75 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="fees-heading" style={{ background: "#fff", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="gold-bar" style={{ margin: "0 auto 1.25rem" }} />
            <h2 id="fees-heading" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "#0f172a", marginBottom: "1rem" }}>
              Tuition &amp; Fees
            </h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.7 }}>
              Applicants (Certifications, Undergraduate, and Graduate): Submit the non-refundable Application Fee and
              Registration Fee ($100.00 Total).
            </p>
          </div>

          <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "3rem" }}>
            <div style={{ background: "#d4af37", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Program Level</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tuition Cost</span>
            </div>
            {tuitionRates.map((t, i) => (
              <div key={i} style={{ padding: "1.1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ color: "#334155", fontSize: "0.95rem", fontWeight: 500 }}>{t.program}</span>
                <span style={{ color: "#0f172a", fontWeight: 800, fontFamily: "'Outfit', sans-serif", fontSize: "1rem" }}>{t.cost}</span>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "3rem" }}>
            <div style={{ background: "#0f172a", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#d4af37", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Fee Type</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#d4af37", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Amount</span>
            </div>
            {fees.map((f, i) => (
              <div key={i} style={{ padding: "1.1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ color: "#334155", fontSize: "0.95rem", fontWeight: 500 }}>{f.label}</span>
                <span style={{ color: "#0f172a", fontWeight: 800, fontFamily: "'Outfit', sans-serif", fontSize: "1rem" }}>{f.amount}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "2.5rem", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "2rem" }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#0f172a", marginBottom: "1.5rem" }}>
              Transfer Credit Fees
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {transferFees.map((t, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.5rem", color: "#d4af37", marginBottom: "0.4rem" }}>{t.fee}</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{t.credits}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: "12px", padding: "1.25rem 1.75rem" }}>
            <p style={{ color: "#713f12", fontSize: "0.85rem", lineHeight: 1.7, margin: 0 }}>
              <strong>Note:</strong> The tuition fees do not include textbook(s), workbook(s), or reference reading materials.
              Upon request, additional book fees will be charged to the student&apos;s account based on course criteria.
              Tuition and fee costs can change at any time without notice from the institution.
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: "linear-gradient(135deg,#0f172a 0%,#1a2744 100%)", padding: "5rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: "#fff", marginBottom: "1.25rem" }}>
            Ready to Begin Your Journey?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "2.5rem" }}>
            Take the first step toward a transformative, Christ-centered education. Applications are open now.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: "1rem", padding: "1rem 2.5rem" }}>
              Apply Now →
            </a>
            <Link href="/contact" className="btn btn-outline-white" style={{ fontSize: "1rem", padding: "1rem 2.5rem" }}>
              Contact Admissions
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .split-section { grid-template-columns: 1fr !important; gap: 2rem !important; } }
      `}</style>
    </main>
  );
}
