"use client";

import { useState } from "react";
import Link from "next/link";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const contactInfo = [
    {
      icon: "🇺🇸",
      label: "US Branch",
      value: "704-607-5540",
      href: "tel:+17046075540",
    },
    {
      icon: "🌍",
      label: "East Africa Branch",
      value: "+254-726-912577",
      href: "tel:+254726912577",
    },
    {
      icon: "✉️",
      label: "Email",
      value: "admin@bmiuniversity.org",
      href: "mailto:admin@bmiuniversity.org",
    },
    {
      icon: "🕐",
      label: "Office Hours",
      value: "Monday – Friday, 9:00 AM – 5:00 PM",
      href: null,
    },
  ];

  return (
    <main id="main-content">
      {/* Page Header */}
      <header
        className="page-header"
        style={{ backgroundImage: "url('/images/contact-hero/contact-hero-1-campus.jpg')" }}
      >
        <div className="page-header-content" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 2rem" }}>
          <h1>Contact Us</h1>
          <p>We&apos;d love to hear from you. Reach out and our team will respond promptly.</p>
        </div>
      </header>

      {/* Contact Info + Form */}
      <section style={{ background: "#f8fafc", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "4rem", alignItems: "start" }} className="split-section">

          {/* Left — Contact Details */}
          <div>
            <div className="gold-bar" />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 2.5vw, 2.4rem)", color: "#0f172a", marginBottom: "1rem" }}>
              Get in Touch
            </h2>
            <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.8, marginBottom: "2.5rem" }}>
              BMI University has offices in the United States and East Africa. Contact the branch nearest to you, or
              send us an email and we will get back to you as soon as possible.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2.5rem" }}>
              {contactInfo.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", flexShrink: 0, width: "48px", textAlign: "center" }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4af37", marginBottom: "0.25rem" }}>
                      {c.label}
                    </div>
                    {c.href ? (
                      <a
                        href={c.href}
                        style={{ color: "#0f172a", fontWeight: 700, fontSize: "1rem", fontFamily: "'Outfit', sans-serif", transition: "color 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#d4af37"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#0f172a"; }}
                      >
                        {c.value}
                      </a>
                    ) : (
                      <span style={{ color: "#334155", fontWeight: 600, fontSize: "0.95rem" }}>{c.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Donate CTA */}
            <div style={{
              background: "linear-gradient(135deg,#0f172a,#1a2744)",
              borderRadius: "16px",
              padding: "2rem",
              border: "1px solid rgba(212,175,55,0.2)",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🙏</div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#fff", marginBottom: "0.6rem" }}>
                Give / Donate
              </h3>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                Support the mission of BMI University and help us train the next generation of Christ-centered leaders worldwide.
              </p>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold"
                style={{ fontSize: "0.9rem", padding: "0.75rem 1.5rem" }}
              >
                Click Here to Give →
              </a>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div style={{ background: "#fff", borderRadius: "24px", padding: "3rem", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.05)" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>✅</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.8rem", color: "#0f172a", marginBottom: "1rem" }}>
                  Message Sent!
                </h3>
                <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.7 }}>
                  Thank you for reaching out to BMI University. We will get back to you within 1–2 business days.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.8rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                  Send a Message
                </h2>
                <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "0.95rem" }}>
                  Fill out the form below and we&apos;ll respond as soon as possible.
                </p>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {[
                    { id: "name", label: "Full Name", type: "text", placeholder: "Your full name" },
                    { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
                    { id: "subject", label: "Subject", type: "text", placeholder: "e.g., Admissions inquiry" },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "#334155", marginBottom: "0.5rem", letterSpacing: "0.02em" }}>
                        {field.label}
                      </label>
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        required
                        placeholder={field.placeholder}
                        value={formData[field.id]}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "0.875rem 1.125rem",
                          borderRadius: "10px",
                          border: "1.5px solid #e2e8f0",
                          fontSize: "0.95rem",
                          color: "#0f172a",
                          outline: "none",
                          transition: "border-color 0.2s",
                          fontFamily: "'Inter', sans-serif",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#d4af37"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
                      />
                    </div>
                  ))}
                  <div>
                    <label htmlFor="message" style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "#334155", marginBottom: "0.5rem" }}>
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      placeholder="How can we help you?"
                      value={formData.message}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "0.875rem 1.125rem",
                        borderRadius: "10px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.95rem",
                        color: "#0f172a",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "'Inter', sans-serif",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#d4af37"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
                    />
                  </div>
                  <button type="submit" className="btn btn-gold" style={{ fontSize: "1rem", padding: "1rem" }}>
                    Send Message →
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Apply CTA strip */}
      <section style={{ background: "#0f172a", padding: "3.5rem 2rem", textAlign: "center", borderTop: "4px solid #d4af37" }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "rgba(255,255,255,0.9)", marginBottom: "1.5rem" }}>
          Ready to take the next step? Apply to BMI University today.
        </p>
        <a href="https://bmiuniversity.org/apply/" target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: "1rem", padding: "0.9rem 2.5rem" }}>
          Apply Now →
        </a>
      </section>

      <style>{`
        @media (max-width: 900px) { .split-section { grid-template-columns: 1fr !important; gap: 2.5rem !important; } }
      `}</style>
    </main>
  );
}
