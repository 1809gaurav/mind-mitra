import {
  BookOpen,
  CheckCircle2,
  Heart,
  HeartHandshake,
  Leaf,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Smile,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

// ─── Scroll Reveal Wrapper ─────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(40px)";
    el.style.transition = `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

// ─── Navbar ────────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
  const { darkMode, setDarkMode } = useAppContext();
  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-theme-surface/90 backdrop-blur-md border-b border-theme-border transition-colors duration-300">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-theme-orange rounded-full flex items-center justify-center text-white -rotate-12 hover:rotate-0 transition-transform duration-300">
          <Leaf size={20} strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-extrabold text-theme-text-primary tracking-tight">
          MindMitra
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {["Features", "How it Works", "About"].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-sm font-semibold text-theme-text-secondary hover:text-theme-orange transition-colors"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2.5 rounded-full transition-colors duration-300 ${
            darkMode
              ? "bg-slate-800 text-yellow-450 hover:bg-slate-700"
              : "bg-orange-50 text-theme-orange hover:bg-orange-100"
          }`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          to="/home"
          className="bg-theme-orange hover:bg-theme-orange-hover text-white font-semibold text-sm py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-md hover:-translate-y-1 hover:scale-105"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
};

// ─── Hero Section ──────────────────────────────────────────────────────────
const HeroSection: React.FC = () => {
  return (
    <section className="mt-32 hero-bg relative py-20 px-6 overflow-hidden flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto gap-12 rounded-[32px] my-8 border border-theme-border transition-colors duration-300">
      {/* Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 blob-shape" />
      <div
        className="absolute bottom-10 right-10 w-80 h-80 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 blob-shape"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-64 h-64 bg-lime-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 blob-shape"
        style={{ animationDelay: "4s" }}
      />

      {/* Left: Text */}
      <div className="relative z-10 flex-1 flex flex-col items-start text-left pl-4 md:pl-12">
        <div className="stagger-1 inline-flex items-center gap-2 px-4 py-2 bg-theme-surface rounded-full border border-theme-border mb-6 shadow-sm hover:shadow-md transition-all">
          <Sparkles size={14} className="text-theme-orange animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-theme-orange">
            Your safe space
          </span>
        </div>

        <h1 className="stagger-2 text-5xl leading-tight font-extrabold text-theme-text-primary mb-6 max-w-xl tracking-tight">
          Your Caring Companion for <br />
          <span className="text-theme-blue dark:text-theme-orange relative inline-block">
            Mental Wellness
            <svg
              className="absolute w-full h-4 -bottom-1 left-0 text-amber-300 dark:text-amber-450"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
            >
              <path
                d="M0,10 Q50,20 100,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset="100"
                style={{ animation: "dash 2s ease-out forwards" }}
              />
            </svg>
          </span>
        </h1>

        <p className="stagger-3 text-lg font-medium text-theme-text-secondary mb-10 max-w-lg leading-relaxed">
          A safe space that listens and understands how you feel. Real-time
          support and gentle guidance whenever you need a friend.
        </p>

        <div className="stagger-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            to="/home"
            className="magnetic-button bg-theme-blue hover:bg-theme-blue/95 text-white font-bold text-lg py-4 px-8 rounded-full shadow-xl hover:shadow-md transition-all duration-300 w-full sm:w-auto text-center"
            onMouseMove={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              const rect = el.getBoundingClientRect();
              const x = e.clientX - rect.left - rect.width / 2;
              const y = e.clientY - rect.top - rect.height / 2;
              el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "translate(0px, 0px) scale(1)";
            }}
          >
            Start Feeling Better
          </Link>
          <a
            href="#features"
            className="bg-theme-surface border border-theme-border text-theme-text-primary font-bold text-lg py-4 px-8 rounded-full hover:border-theme-orange hover:text-theme-orange transition-all duration-300 w-full sm:w-auto text-center hover:shadow-md hover:-translate-y-0.5"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Right: Illustration */}
      <div className="flex-1 w-full relative z-10 flex justify-center p-8 stagger-2">
        <div className="w-full max-w-md aspect-square bg-lime-300 dark:bg-lime-900 rounded-full flex flex-col items-center justify-center shadow-2xl relative overflow-visible border-4 border-theme-border transition-all duration-300">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-theme-orange rounded-full flex items-center justify-center rotate-12 shadow-lg border-4 border-theme-border hover:scale-110 hover:rotate-[24deg] transition-all duration-300">
            <Heart size={28} className="text-white" fill="white" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-violet-300 dark:bg-violet-850 rounded-full flex items-center justify-center -rotate-12 shadow-lg border-4 border-theme-border hover:scale-110 hover:-rotate-[24deg] transition-all duration-300">
            <Smile size={24} className="text-white" />
          </div>
          <span className="text-8xl mb-4 hover:scale-110 transition-transform duration-300 cursor-default select-none">
            🌻
          </span>
          <h3 className="text-lime-950 dark:text-lime-100 font-bold text-center px-8 text-xl">
            We're here for you,
            <br />
            every step.
          </h3>
        </div>
      </div>
    </section>
  );
};

// ─── Features Section ──────────────────────────────────────────────────────
const FeaturesSection: React.FC = () => (
  <section
    id="features"
    className="py-24 px-6 max-w-7xl mx-auto reveal-on-scroll"
  >
    <div className="text-center mb-16">
      <h2 className="text-4xl font-extrabold text-theme-text-primary mb-4 tracking-tight">
        A Space That Understands You
      </h2>
      <p className="text-lg font-medium text-theme-text-secondary max-w-2xl mx-auto">
        Gentle tools crafted to help you navigate your emotional landscape with
        warmth and care.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Card 1 — Wide: Gentle Check-ins */}
      <Reveal
        delay={100}
        className="glass-panel p-10 rounded-3xl flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-2 bg-theme-card-blue border border-theme-border/60"
      >
        <div className="relative z-10">
          <div className="w-16 h-16 bg-theme-bg rounded-full flex items-center justify-center mb-6 shadow-sm text-theme-blue border border-theme-border/50">
            <HeartHandshake size={30} />
          </div>
          <h3 className="text-2xl font-bold text-theme-text-primary mb-3">
            Gentle Check-ins
          </h3>
          <p className="text-base font-semibold text-theme-text-secondary max-w-md">
            We pay attention to your words and feelings to understand how you're
            really doing, processing everything safely on your own device.
          </p>
        </div>
        <div className="mt-10 relative h-56 w-full rounded-3xl bg-amber-300 flex items-center justify-center border-4 border-theme-border shadow-inner overflow-hidden z-10">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, black 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
          <span className="text-6xl relative z-10 hover:scale-125 transition-transform duration-300 cursor-default">
            🌟✨
          </span>
        </div>
      </Reveal>

      {/* Card 2 — Supportive Chat */}
      <Reveal
        delay={200}
        className="glass-panel p-10 rounded-3xl flex flex-col col-span-1 bg-theme-card-orange border border-theme-border/60"
      >
        <div className="relative z-10">
          <div className="w-16 h-16 bg-theme-bg rounded-full flex items-center justify-center mb-6 shadow-sm text-theme-orange border border-theme-border/50">
            <MessageCircle size={30} />
          </div>
          <h3 className="text-2xl font-bold text-theme-text-primary mb-3">
            Supportive Chat
          </h3>
          <p className="text-base font-semibold text-theme-text-secondary flex-grow">
            Warm, guided conversations to help you navigate difficult feelings,
            available whenever you need someone to talk to.
          </p>
        </div>
        <div className="mt-8 space-y-4 z-10 relative">
          <div className="bg-theme-surface rounded-3xl rounded-tl-sm p-4 text-base font-semibold text-theme-text-primary w-4/5 shadow-sm border border-theme-border hover:-translate-y-1 transition-transform">
            I'm here for you. How are you feeling today?
          </div>
          <div className="bg-theme-orange text-white rounded-3xl rounded-tr-sm p-4 text-base font-semibold w-4/5 ml-auto text-right shadow-sm border border-theme-border/20 hover:-translate-y-1 transition-transform">
            I've been feeling a bit overwhelmed lately.
          </div>
        </div>
      </Reveal>

      {/* Card 3 — Immediate Help */}
      <Reveal
        delay={300}
        className="glass-panel p-10 rounded-3xl flex flex-col col-span-1 bg-theme-card-violet border border-theme-border/60"
      >
        <div className="relative z-10">
          <div className="w-16 h-16 bg-theme-bg rounded-full flex items-center justify-center mb-6 shadow-sm text-violet-400 border border-theme-border/50">
            <PhoneCall size={30} />
          </div>
          <h3 className="text-2xl font-bold text-theme-text-primary mb-3">
            Immediate Help
          </h3>
          <p className="text-base font-semibold text-theme-text-secondary mb-8">
            When things feel too heavy, we'll gently connect you with the right
            crisis support and friendly resources right away.
          </p>
        </div>
        <div className="mt-auto h-32 w-full rounded-3xl bg-violet-300 dark:bg-violet-850 flex items-center justify-center border-4 border-theme-border z-10 relative group">
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 cursor-default">
            🫂
          </span>
        </div>
      </Reveal>

      {/* Card 4 — Personal Journal (wide) */}
      <Reveal
        delay={400}
        className="glass-panel p-10 rounded-3xl flex flex-col col-span-1 md:col-span-2 lg:col-span-2 bg-theme-card-green border border-theme-border/60"
      >
        <div className="relative z-10 w-16 h-16 bg-theme-bg rounded-full flex items-center justify-center mb-6 shadow-sm text-theme-text-primary border border-theme-border/50">
          <BookOpen size={30} />
        </div>
        <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-theme-text-primary mb-3">
              Your Personal Journal
            </h3>
            <p className="text-base font-semibold text-theme-text-secondary">
              Reflect on your days and see your growth. We'll help you spot what
              makes you feel best and celebrate your little victories.
            </p>
          </div>
          <div className="flex-1 w-full flex flex-wrap gap-3 justify-center md:justify-end">
            {[
              { label: "Calm 🌊", cls: "text-theme-blue border-theme-border" },
              { label: "Focused 🎯", cls: "text-theme-orange border-theme-border" },
              { label: "Tired 🥱", cls: "text-theme-text-secondary border-theme-border" },
              {
                label: "Grateful ✨",
                cls: "text-lime-900 bg-lime-300 border-white scale-110 rotate-2 hover:rotate-6",
              },
            ].map(({ label, cls }) => (
              <span
                key={label}
                className={`px-6 py-3 bg-theme-surface font-bold text-sm rounded-full shadow-sm border border-theme-border hover:scale-105 transition-all cursor-default ${cls}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

// ─── How It Works Section ──────────────────────────────────────────────────
const HowItWorksSection: React.FC = () => (
  <section
    id="how-it-works"
    className="py-24 px-6 bg-theme-surface relative overflow-hidden reveal-on-scroll transition-colors duration-300"
  >
    <div
      className="absolute top-0 left-0 w-full h-full opacity-20"
      style={{
        backgroundImage: "radial-gradient(#f2f4f6 2px, transparent 2px)",
        backgroundSize: "32px 32px",
      }}
    />
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-20">
        <h2 className="text-4xl font-extrabold text-theme-text-primary mb-4 tracking-tight">
          A Simple Path to Clarity
        </h2>
        <p className="text-lg font-medium text-theme-text-secondary max-w-2xl mx-auto">
          Three seamless steps to begin your journey toward feeling more like
          yourself.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 relative">
        {/* Connecting gradient line */}
        <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-2 bg-gradient-to-r from-amber-300 via-orange-400 to-violet-300 rounded-full z-0 opacity-30" />

        {[
          {
            num: "1",
            bg: "bg-amber-300",
            textColor: "text-gray-900",
            shape: "rounded-3xl -rotate-6 hover:rotate-0",
            title: "Create Your Safe Space",
            desc: "Set up a private, secure profile that acts as your personal sanctuary, entirely yours alone.",
            delay: 100,
          },
          {
            num: "2",
            bg: "bg-orange-400",
            textColor: "text-white",
            shape: "rounded-full scale-110 hover:scale-125",
            title: "Express Yourself Safely",
            desc: "Share your feelings naturally. Everything stays right on your device, never sent away to the cloud.",
            delay: 200,
          },
          {
            num: "3",
            bg: "bg-violet-300",
            textColor: "text-white",
            shape: "rounded-3xl rotate-6 hover:rotate-0",
            title: "Receive Warm Support",
            desc: "Get gentle exercises and friendly coping strategies crafted just for what you're going through right now.",
            delay: 300,
          },
        ].map(({ num, bg, textColor, shape, title, desc, delay }) => (
          <Reveal
            key={num}
            delay={delay}
            className="flex-1 relative z-10 flex flex-col items-center text-center"
          >
            <div
              className={`w-24 h-24 ${bg} flex items-center justify-center mb-8 shadow-lg ${textColor} text-4xl font-extrabold border-4 border-theme-border transition-all duration-300 hover:scale-110 ${shape}`}
            >
              {num}
            </div>
            <h3 className="text-2xl font-bold text-theme-text-primary mb-3">
              {title}
            </h3>
            <p className="text-base font-semibold text-theme-text-secondary">{desc}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

// ─── Privacy & Trust Section ───────────────────────────────────────────────
const PrivacySection: React.FC = () => (
  <section
    id="about"
    className="py-24 px-6 max-w-7xl mx-auto text-center reveal-on-scroll"
  >
    <div className="max-w-4xl mx-auto bg-lime-300 dark:bg-lime-900 p-12 md:p-16 rounded-3xl shadow-2xl border-4 border-theme-border relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full opacity-20 group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white rounded-full opacity-20 group-hover:scale-110 transition-transform duration-700" />

      <div className="w-24 h-24 bg-white dark:bg-lime-950 rounded-full mx-auto flex items-center justify-center shadow-sm mb-6 transition-transform duration-1000 ease-in-out">
        <ShieldCheck size={48} className="text-lime-900 dark:text-lime-150" />
      </div>

      <h2 className="text-4xl font-black text-lime-950 dark:text-lime-100 mb-6 tracking-tight">
        Your Privacy is Our Priority
      </h2>
      <p className="text-xl font-semibold text-lime-900/80 dark:text-lime-200/85 mb-10 max-w-2xl mx-auto">
        We believe your personal journey should be completely private. We use
        top-tier security measures so that your thoughts and feelings stay
        entirely with you. We never see your personal data.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {[
          "End-to-End Security",
          "Stored Only on Your Device",
          "Completely Confidential",
        ].map((label) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-white dark:bg-lime-950 rounded-full px-6 py-4 shadow-sm hover:scale-105 hover:shadow-md transition-all cursor-default border border-theme-border/20"
          >
            <CheckCircle2 size={20} className="text-theme-orange" />
            <span className="text-sm font-bold text-gray-900 dark:text-lime-100">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          to="/home"
          className="inline-block bg-lime-900 hover:bg-lime-950 text-white font-bold text-lg py-4 px-10 rounded-full shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 border border-lime-950/20"
        >
          Create Your Private Account
        </Link>
        <p className="mt-4 text-sm font-semibold text-lime-900/70 dark:text-lime-200/70">
          Free to start. No credit card required.
        </p>
      </div>
    </div>
  </section>
);

// ─── Footer ─────────────────────────────────────────────────────────────────
const Footer: React.FC = () => (
  <footer className="bg-theme-surface w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-theme-border mt-8 transition-colors duration-300">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-theme-orange rounded-full flex items-center justify-center text-white">
        <Leaf size={16} strokeWidth={2.5} />
      </div>
      <span className="text-2xl font-extrabold text-theme-text-primary">MindMitra</span>
    </div>

    <nav className="flex flex-col md:flex-row items-center gap-8">
      {[
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        {
          label: "support@mindmitra.app",
          href: "mailto:support@mindmitra.app",
        },
      ].map(({ label, href }) => (
        <a
          key={label}
          href={href}
          className="text-sm font-bold text-theme-text-secondary hover:text-theme-orange transition-all duration-300"
        >
          {label}
        </a>
      ))}
    </nav>

    <p className="text-base font-semibold text-theme-text-secondary">
      © 2026 MindMitra. All rights reserved.
    </p>
  </footer>
);

// ─── Landing Page Root ─────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "none";
      });
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    document
      .querySelectorAll(".reveal-on-scroll")
      .forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary font-sans antialiased overflow-x-clip transition-colors duration-300">
      <Navbar />
      <main className="flex-grow pb-16">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PrivacySection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
