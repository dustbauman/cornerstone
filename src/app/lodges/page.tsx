import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Award,
  ClipboardCheck,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TyrianHeroBackground from "@/components/brand/TyrianHeroBackground";
import FoundingLodgeBadge from "@/components/brand/FoundingLodgeBadge";
import { createClient } from "@/lib/supabase/server";
import { getFoundingSlotCounts } from "@/lib/pricing/founding";
import { FOUNDING_SLOTS_TOTAL, FOUNDING_TIER_1_SLOTS, STANDARD_ANNUAL_PRICE_DOLLARS } from "@/lib/pricing/constants";

export const metadata = {
  title: "Bring Tyrian to Your Lodge",
  description:
    "Tyrian is unlocked through your lodge — and any brother can be the one to unlock it. Open the door once, and every member is in for good.",
};

const CHAMPION_REASONS = [
  {
    icon: Award,
    role: "the Worshipful Master",
    title: "Leave a lasting mark",
    body: "Give every brother a verified professional network that outlives your year in the East — and a reason younger men see real value in the apron.",
  },
  {
    icon: ClipboardCheck,
    role: "the Secretary",
    title: "A benefit that runs itself",
    body: "No rosters to manage, no renewals to chase. Unlock it once and every member is covered — it simply works.",
  },
  {
    icon: Wrench,
    role: "the business owners",
    title: "Keep the work in the Craft",
    body: "Your trade, listed and verified, in front of every brother who needs it — and findable by the public on Google. Referrals stay within the brotherhood instead of going to strangers.",
  },
];

export default async function LodgesPage() {
  let totalRemaining = FOUNDING_SLOTS_TOTAL;
  let lifetimeRemaining = FOUNDING_TIER_1_SLOTS;
  try {
    const supabase = createClient();
    const counts = await getFoundingSlotCounts(supabase);
    totalRemaining = counts.totalRemaining;
    lifetimeRemaining = counts.pioneerRemaining;
  } catch {
    // Fall back to the full slot count if the lookup fails — page still renders.
  }
  const foundingOpen = totalRemaining > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="text-white relative overflow-hidden border-b border-gold/25">
        <TyrianHeroBackground markSize="large" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold text-sm font-medium uppercase tracking-[0.1em] px-4 py-1.5 rounded-full mb-6">
              <KeyRound size={14} />
              For Lodges
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight mb-6">
              Bring Tyrian to Your Lodge.
            </h1>
            <p className="text-white/70 text-xl leading-relaxed mb-10 max-w-2xl">
              Membership runs through the lodge. Master, Secretary, or tradesman —
              any brother can open Tyrian for all of them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold text-lg px-8 py-4 rounded-xl transition-colors"
              >
                Check if your lodge is on
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/directory"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
              >
                Browse the Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How a verified Mason gets on */}
      <section className="py-20 bg-stone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-navy mb-3">
              How a verified Mason gets on
            </h2>
            <p className="text-muted text-lg leading-relaxed">
              Access flows through the lodge — so there are three ways a brother
              finds his place on Tyrian.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Your lodge is already on",
                body: "Ask your lodge admin for an invite link. You’ll claim your free membership and list your business in minutes.",
                cta: "Find your lodge",
                href: "/join",
              },
              {
                step: "02",
                title: "Be the brother who brings it on",
                body: "If your lodge isn’t on yet, you can be the one to unlock it — opening Tyrian free for every member of your lodge.",
                cta: "Unlock your lodge",
                href: "/join",
              },
              {
                step: "03",
                title: "Not sure? Look it up",
                body: "Enter your lodge number and state. We’ll tell you instantly whether your lodge is already on Tyrian.",
                cta: "Check my lodge",
                href: "/join",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
                  {item.step}
                </p>
                <h3 className="font-serif text-xl font-bold text-navy mb-3">
                  {item.title}
                </h3>
                <p className="text-muted leading-relaxed flex-1">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-5 text-sm font-semibold text-navy hover:text-gold transition-colors"
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why bring it on — one reason per champion */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-navy mb-3">
              Why open Tyrian for your lodge
            </h2>
            <p className="text-muted text-lg leading-relaxed">
              One brother opens the door. The whole lodge walks through it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CHAMPION_REASONS.map(({ icon: Icon, role, title, body }) => (
              <div
                key={title}
                className="bg-stone rounded-2xl p-8 border border-transparent hover:border-gold/30 transition-colors flex flex-col"
              >
                <div className="w-11 h-11 rounded-full bg-navy/5 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-navy" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
                  {role}
                </p>
                <h3 className="font-serif text-xl font-bold text-navy mb-3">
                  {title}
                </h3>
                <p className="text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unlock + founding */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {foundingOpen && (
            <div className="mb-6 flex justify-center">
              <FoundingLodgeBadge variant="hero" label="Founding Lodge" />
            </div>
          )}
          <h2 className="font-serif text-4xl font-bold mb-6">
            Any brother can unlock it for the whole lodge
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-4">
            The first five lodges become{" "}
            <span className="text-gold font-semibold">Founding Lodge</span> —
            free for life. After that, every lodge is ${STANDARD_ANNUAL_PRICE_DOLLARS}/year.
          </p>
          {foundingOpen && (
            <p className="text-white/50 text-sm mb-10">
              {lifetimeRemaining > 0
                ? `${lifetimeRemaining} of ${FOUNDING_TIER_1_SLOTS} lifetime founding lodges remain.`
                : `${totalRemaining} early lodge spots remain at normal $${STANDARD_ANNUAL_PRICE_DOLLARS}/year access.`}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold text-lg px-8 py-4 rounded-xl transition-colors"
            >
              Bring Tyrian to your lodge
              <ArrowRight size={20} />
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-8 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-trust" />
            Every member joins free once the lodge is on.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
