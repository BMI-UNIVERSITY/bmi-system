"use client";

import { useState } from "react";
import Link from "next/link";

const quickLinks = [
  { label: "Academics",  href: "/academics"  },
  { label: "Admissions", href: "/admissions" },
  { label: "About Us",   href: "/about"      },
  { label: "Contact",    href: "/contact"    },
  { label: "Apply Now",  href: "https://bmiuniversity.org/apply/", external: true },
];

const programCategories = [
  { label: "Bachelor's Degrees", href: "/academics#undergraduate" },
  { label: "Master's Degrees", href: "/academics#graduate" },
  { label: "Doctorate", href: "/academics#doctorate" },
  { label: "Graduate Certificates", href: "/academics#certificate" },
];

const socialLinks = [
  {
    label: "Facebook",
    type: "button",
    icon: (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    type: "button",
    icon: (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer className="bg-gradient-to-b from-[#0c1628] to-[#0f172a] border-t-[5px] border-[#d4af37] text-white">

      {/* ── Top: Newsletter ── */}
      <div className="bg-white/5 border-b border-white/10 px-6 py-12 sm:px-12 sm:py-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-white mb-2">
              Stay Connected with BMI University
            </h2>
            <p className="text-white/60 text-sm md:text-base">
              Get news, events, and updates from our growing global community.
            </p>
          </div>
          {subscribed ? (
            <p className="text-[#d4af37] font-bold text-lg">✓ You're subscribed! Welcome to the BMI family.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-3 flex-col sm:flex-row">
              <label htmlFor="footer-email" className="sr-only">Email</label>
              <input
                id="footer-email" type="email" required
                placeholder="Your email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="px-5 py-3.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] w-full sm:min-w-[300px] transition-all"
              />
              <button type="submit" className="bg-[#d4af37] hover:bg-[#b8952d] text-[#0f172a] font-bold px-8 py-3.5 rounded-lg transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Main Footer ── */}
      <div className="max-w-7xl mx-auto px-6 py-16 sm:px-12 lg:py-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

        {/* Brand */}
        <div className="flex flex-col items-start lg:pr-6">
          <Link
            href="/"
            aria-label="BMI University — Home"
            className="flex items-center gap-3 mb-6 no-underline group"
          >
            <img
              src="/images/bmi-crest-270.png"
              alt="BMI University Crest"
              className="h-14 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-sans font-black text-xl text-white leading-tight tracking-tight">
              BMI<br />
              <span className="text-[#d4af37] text-xs font-bold tracking-widest uppercase">University</span>
            </span>
          </Link>
          <p className="text-white/60 leading-relaxed mb-6 text-sm max-w-[280px]">
            Developing Christ-centered men and women with the values, knowledge, and skills essential to impact the world.
          </p>
          <Link href="/accreditation" className="inline-block text-[#d4af37] text-sm font-bold mb-8 no-underline hover:text-white transition-colors">
            🏅 Accredited by QAHE →
          </Link>
          <div className="flex gap-3">
            {socialLinks.map((s) => (
              <button key={s.label} type="button" aria-label={s.label}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:bg-[#d4af37] hover:text-[#0f172a] hover:border-[#d4af37] transition-all cursor-pointer">
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <nav aria-label="Footer quick links" className="flex flex-col">
          <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-[#d4af37] mb-6">
            Quick Links
          </h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-4">
            {quickLinks.map((l) => (
              <li key={l.label}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                    className="text-white/70 text-sm hover:text-[#d4af37] hover:translate-x-1 inline-block transition-all">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href}
                    className="text-white/70 text-sm hover:text-[#d4af37] hover:translate-x-1 inline-block transition-all">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Programs */}
        <nav aria-label="Footer programs" className="flex flex-col">
          <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-[#d4af37] mb-6">
            Programs
          </h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-4">
            {programCategories.map((p) => (
              <li key={p.label}>
                <Link href={p.href} className="text-white/70 text-sm hover:text-[#d4af37] hover:translate-x-1 inline-block transition-all">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <address className="not-italic flex flex-col">
          <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-[#d4af37] mb-6">
            Contact Us
          </h3>
          <div className="flex flex-col gap-6">
            <div className="flex gap-4 items-start group">
              <svg className="w-5 h-5 text-white/40 mt-0.5 group-hover:text-[#d4af37] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="text-white/40 text-[0.65rem] uppercase tracking-wider mb-1">US Branch</div>
                <a href="tel:+17046075540" className="text-white/80 text-sm font-semibold hover:text-[#d4af37] transition-colors">
                  704-607-5540
                </a>
              </div>
            </div>
            
            <div className="flex gap-4 items-start group">
              <svg className="w-5 h-5 text-white/40 mt-0.5 group-hover:text-[#d4af37] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-white/40 text-[0.65rem] uppercase tracking-wider mb-1">East Africa Branch</div>
                <a href="tel:+254726912577" className="text-white/80 text-sm font-semibold hover:text-[#d4af37] transition-colors">
                  +254-726-912577
                </a>
              </div>
            </div>
            
            <div className="flex gap-4 items-start group">
              <svg className="w-5 h-5 text-white/40 mt-0.5 group-hover:text-[#d4af37] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-white/40 text-[0.65rem] uppercase tracking-wider mb-1">Email</div>
                <a href="mailto:admin@bmiuniversity.org" className="text-white/80 text-sm font-semibold hover:text-[#d4af37] transition-colors break-all">
                  admin@bmiuniversity.org
                </a>
              </div>
            </div>
            
            <div className="flex gap-4 items-start group">
              <svg className="w-5 h-5 text-white/40 mt-0.5 group-hover:text-[#d4af37] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <div>
                <div className="text-white/40 text-[0.65rem] uppercase tracking-wider mb-1">Give / Donate</div>
                <a href="https://www.paypal.com/donate/?hosted_button_id=NTSHAE86BEUBN" target="_blank" rel="noopener noreferrer"
                  className="text-[#d4af37] text-sm font-bold hover:text-white transition-colors">
                  Click here to give →
                </a>
              </div>
            </div>
          </div>
        </address>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/10 px-6 py-6 sm:px-12 bg-black/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-[0.8rem]">
            &copy; {new Date().getFullYear()} BMI University. All Rights Reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-white/40 text-[0.8rem] hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <button type="button" className="text-white/40 text-[0.8rem] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">
              Terms of Service
            </button>
            <button type="button" className="text-white/40 text-[0.8rem] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">
              Accessibility
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
}
