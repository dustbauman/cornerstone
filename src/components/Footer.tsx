import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <Logo variant="light" size="sm" />
            <p className="mt-3 text-sm text-white/50 max-w-xs leading-relaxed font-serif italic">
              A professional network built on trust.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/directory" className="hover:text-white transition-colors">Directory</Link></li>
              <li><Link href="/requests" className="hover:text-white transition-colors">Service Requests</Link></li>
              <li><span className="cursor-default">List Your Business</span></li>
              <li><span className="cursor-default">Sign In</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="cursor-default">About Tyrian</span></li>
              <li><span className="cursor-default">For Lodges</span></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Lodge Admin</Link></li>
              <li><span className="cursor-default">Join the Network</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© 2025 Tyrian. All rights reserved. · Built on a foundation of trust.</p>
          <div className="flex gap-4">
            <span className="cursor-default">Privacy Policy</span>
            <span className="cursor-default">Terms of Use</span>
            <span className="cursor-default">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
