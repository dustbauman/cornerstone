import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Wrench,
  Zap,
  Scale,
  Droplets,
  Leaf,
  Car,
  Wind,
  TrendingUp,
  HardHat,
  Monitor,
  Home,
  PaintBucket,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const CATEGORIES = [
  { label: "Roofing", icon: Home },
  { label: "Electrical", icon: Zap },
  { label: "Plumbing", icon: Droplets },
  { label: "Legal", icon: Scale },
  { label: "HVAC", icon: Wind },
  { label: "Financial", icon: TrendingUp },
  { label: "General Contractor", icon: HardHat },
  { label: "Technology", icon: Monitor },
  { label: "Home Inspection", icon: Wrench },
  { label: "Automotive", icon: Car },
  { label: "Landscaping", icon: Leaf },
  { label: "Painting", icon: PaintBucket },
];

const STATS = [
  { value: "1,200+", label: "Verified Professionals" },
  { value: "48", label: "Lodges on the Network" },
  { value: "12", label: "States Covered" },
  { value: "50+", label: "Open Requests" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    label: "Looking for a service?",
    title: "Hire someone you can trust.",
    body: "Post a request or browse verified lodge professionals. Every listing is backed by a real sponsor confirmation — not an anonymous profile and five stars from strangers.",
    cta: "Browse the directory",
    href: "/directory",
  },
  {
    step: "02",
    label: "Have a skill or trade?",
    title: "Your brothers need what you know.",
    body: "The request board shows real demand from real members nearby. You don't need a formal business to list — just a skill and a willingness to help.",
    cta: "See open requests",
    href: "/requests",
  },
  {
    step: "03",
    label: "Part of the brotherhood?",
    title: "This is your network.",
    body: "Browse your lodge's members, listings, and open requests. Connect with lodges in every state. The craft has always been built on mutual support — Tyrian is where that happens.",
    cta: "Explore the network",
    href: "/network",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold text-sm font-medium uppercase tracking-[0.1em] px-4 py-1.5 rounded-full mb-6">
              <ShieldCheck size={14} />
              The professional network for Freemasons
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight mb-6">
              Never hire a stranger.
              <span className="text-gold block mt-1">Never work alone.</span>
            </h1>
            <p className="text-white/70 text-xl leading-relaxed mb-10 max-w-2xl">
              Tyrian connects lodge-verified professionals with the brothers who need them — and gives
              every Mason a place to put their skills to work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/directory"
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold text-lg px-8 py-4 rounded-xl transition-colors"
              >
                Browse the Directory
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
              >
                List Your Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-navy-dark text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-serif text-3xl font-bold text-gold">{s.value}</div>
                <div className="text-white/50 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-6">Growing across Florida, Oklahoma, and beyond.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-stone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-navy mb-3">Built for every member</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">{item.label}</p>
                <h3 className="font-serif text-xl font-bold text-navy mb-3">{item.title}</h3>
                <p className="text-muted leading-relaxed flex-1">{item.body}</p>
                <Link href={item.href} className="mt-5 text-sm font-semibold text-navy hover:text-gold transition-colors">
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-navy mb-3">Browse by profession</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                href={`/directory?category=${encodeURIComponent(label)}`}
                className="flex flex-col items-center gap-2.5 p-5 bg-stone rounded-xl hover:bg-gold/5 hover:border-gold/30 border border-transparent transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Icon size={20} className="text-navy group-hover:text-gold transition-colors" />
                </div>
                <span className="text-sm font-medium text-navy text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/directory" className="text-sm font-semibold text-navy hover:text-gold transition-colors">
              View all categories →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust / accountability section */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-serif text-4xl font-bold mb-6">
                Accountability you can see
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-5">
                Freemasonry has built one of the most trusted fraternal networks in history.
                Tyrian puts that network to work — connecting lodge-verified professionals with
                people who value accountability over algorithms.
              </p>
              <p className="text-white/60 text-lg leading-relaxed">
                Every listing on Tyrian is tied to a real person, a real lodge, and a real
                community of peers. When you hire through Tyrian, you&apos;re not relying on
                anonymous reviews. You&apos;re tapping into a network where reputation has
                always mattered.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {[
                {
                  title: "Lodge-verified listings",
                  body: "Every professional is confirmed by a lodge sponsor before they can list. No anonymous profiles.",
                },
                {
                  title: "Member-reviewed",
                  body: "Reviews come from verified members who have actually hired the professional — not the general public.",
                },
                {
                  title: "Publicly searchable",
                  body: "Tyrian profiles are indexed and findable on Google — giving listed professionals a second business presence on the open web.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-trust flex-shrink-0" />
                    <h4 className="font-semibold text-white">{title}</h4>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service request callout */}
      <section className="py-14 bg-stone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-2xl font-bold text-navy mb-2">Can&apos;t find what you need?</h3>
              <p className="text-muted max-w-xl">
                Post a service request to the network. Verified professionals in your area will
                respond directly — no middleman, no fees.
              </p>
            </div>
            <Link
              href="/requests"
              className="inline-flex items-center justify-center gap-2 bg-navy hover:bg-navy-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors flex-shrink-0"
            >
              Post a Request →
            </Link>
          </div>
        </div>
      </section>

      {/* For members / for public */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-navy mb-3">Built for members. Open to all.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-navy rounded-2xl p-8 text-white">
              <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-3">For Freemasons</p>
              <h3 className="font-serif text-2xl font-bold mb-4">Grow your business within the network</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                List your business, receive referrals from fellow lodge members, and build a
                verified professional reputation that compounds over time. Your lodge affiliation
                is your credential — put it to work.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                List Your Business →
              </Link>
            </div>

            <div className="bg-stone rounded-2xl p-8">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-3">For the public</p>
              <h3 className="font-serif text-2xl font-bold text-navy mb-4">Hire professionals you can trust</h3>
              <p className="text-muted leading-relaxed mb-6">
                Every business on Tyrian has been vetted through a real community vetting
                process — not a credit card charge. Browse freely, contact directly, hire
                confidently.
              </p>
              <Link
                href="/directory"
                className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                Browse the Directory →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
