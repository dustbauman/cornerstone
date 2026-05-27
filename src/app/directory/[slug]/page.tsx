import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  Share2,
  Users,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VerifiedBadge from "@/components/VerifiedBadge";
import CategoryBadge from "@/components/CategoryBadge";
import StarRating from "@/components/StarRating";
import ListingCard from "@/components/ListingCard";
import { getListingBySlug, getRelatedListings, listings } from "@/data/listings";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return listings.map((l) => ({ slug: l.slug }));
}

export default function BusinessProfilePage({ params }: Props) {
  const listing = getListingBySlug(params.slug);
  if (!listing) notFound();

  const related = getRelatedListings(listing);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Breadcrumb */}
        <nav className="inline-flex items-center gap-1.5 text-sm text-muted mb-6">
          <Link href="/directory" className="hover:text-navy transition-colors">Directory</Link>
          <span className="text-gray-300">›</span>
          <span className="text-muted">{listing.trade}</span>
          <span className="text-gray-300">›</span>
          <span className="text-[#1A1A1A] font-medium">{listing.businessName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex flex-wrap items-start gap-3 mb-5">
                <CategoryBadge trade={listing.trade} />
                <VerifiedBadge size="md" />
              </div>

              <h1 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-1">
                {listing.businessName}
              </h1>
              <p className="text-muted text-lg mb-1">{listing.ownerName}</p>
              <p className="text-sm text-muted mb-4">
                Member since {new Date(listing.joinedDate).getFullYear()}
              </p>

              <StarRating rating={listing.rating} reviewCount={listing.reviewCount} size={16} />

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-gold" />
                  {listing.location.city}, {listing.location.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-gold" />
                  {listing.lodge} #{listing.lodgeNumber} · {listing.location.city}, {listing.location.stateCode}
                </span>
              </div>
            </div>

            {/* Verification statement */}
            <div className="bg-trust/5 border border-trust/15 rounded-2xl p-5 flex items-start gap-3">
              <ShieldCheck size={18} className="text-trust flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-serif italic text-sm text-trust">Lodge-verified member in good standing.</p>
                <p className="text-sm text-muted mt-0.5">Confirmed by a lodge sponsor and accountable to their Masonic community.</p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h2 className="font-serif text-xl font-bold text-navy mb-4">About {listing.businessName}</h2>
              <p className="text-[#1A1A1A] leading-relaxed">{listing.description}</p>
            </div>

            {/* Services */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h2 className="font-serif text-xl font-bold text-navy mb-4">Services</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {listing.services.map((service) => (
                  <li key={service} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 size={16} className="text-trust flex-shrink-0" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Map stub */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="font-serif text-xl font-bold text-navy">Location</h2>
                <p className="text-sm text-muted mt-1">
                  {listing.location.city}, {listing.location.state}
                </p>
              </div>
              <div className="w-full h-56">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3e5o&q=${encodeURIComponent(listing.location.city + ", " + listing.location.state)}`}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-serif text-lg font-bold text-navy mb-4">Get in touch</h3>
              <div className="space-y-3">
                <a
                  href={`tel:${listing.phone}`}
                  className="flex items-center gap-3 text-sm hover:text-navy transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                    <Phone size={15} className="text-navy" />
                  </div>
                  <span>{listing.phone}</span>
                </a>
                <a
                  href={`mailto:${listing.email}`}
                  className="flex items-center gap-3 text-sm hover:text-navy transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                    <Mail size={15} className="text-navy" />
                  </div>
                  <span className="truncate">{listing.email}</span>
                </a>
                <span
                  className="flex items-center gap-3 text-sm text-muted group cursor-default"
                >
                  <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center">
                    <Globe size={15} className="text-navy" />
                  </div>
                  <span className="truncate">{listing.website.replace("https://", "")}</span>
                </span>
              </div>

              <button className="mt-5 w-full bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-xl transition-colors text-sm">
                Contact {listing.ownerName.split(" ")[1]} →
              </button>
              <p className="text-xs text-muted text-center mt-2">
                Tyrian members are verified professionals accountable to their lodge community.
              </p>
            </div>

            {/* Verified member info card */}
            <div className="bg-trust/5 border border-trust/15 rounded-2xl p-5">
              <VerifiedBadge size="sm" />
              <p className="text-sm text-[#1A1A1A] mt-3 leading-relaxed">
                <span className="font-semibold">{listing.ownerName}</span> is a confirmed member of{" "}
                <span className="font-semibold">{listing.lodge} #{listing.lodgeNumber}</span>.
                Membership verified by lodge sponsor.
              </p>
              <p className="text-xs text-muted mt-2">
                Member since {new Date(listing.joinedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Referral stub */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={16} className="text-gold" />
                <h4 className="font-semibold text-navy text-sm">Referred by a member?</h4>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-3">
                If a Tyrian member sent you here, mention their name when you reach out.
                Referrals are tracked and credited within the network.
              </p>
              <button className="text-xs text-navy font-semibold border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5 transition-colors w-full">
                Enter Referral Code
              </button>
            </div>
          </div>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-navy mb-6">
              Other verified professionals in {listing.location.state}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => (
                <ListingCard key={r.id} listing={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
