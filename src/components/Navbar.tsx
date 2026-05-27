"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, UserCircle, LogOut, LayoutDashboard, Settings, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";

export default function Navbar() {
  const { isLoggedIn, user, toggleAuth } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-navy sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo variant="light" size="sm" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/directory" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Browse Directory
            </Link>
            <Link href="/requests" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Requests
            </Link>
            {isLoggedIn && (
              <>
                <Link href="/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  My Dashboard
                </Link>
                <Link href="/admin" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Lodge Admin
                </Link>
              </>
            )}
          </div>

          {/* Auth area + demo toggle */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <UserCircle size={18} />
                  <span className="font-medium">{user?.name.replace("Brother ", "")}</span>
                </div>
                <button
                  onClick={toggleAuth}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
                  title="Demo: toggle auth state"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAuth}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
                <Link
                  href="/directory"
                  className="bg-gold hover:bg-gold-dark text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  List Your Business
                </Link>
              </div>
            )}

            {/* Demo mode indicator */}
            <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 font-mono">
              DEMO
            </span>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-navy-dark border-t border-white/10 px-4 py-4 space-y-3">
          <Link
            href="/directory"
            className="block text-white/80 hover:text-white text-base font-medium py-2"
            onClick={() => setMenuOpen(false)}
          >
            Browse Directory
          </Link>
          <Link
            href="/requests"
            className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2"
            onClick={() => setMenuOpen(false)}
          >
            <ClipboardList size={16} />
            Requests
          </Link>
          {isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2"
                onClick={() => setMenuOpen(false)}
              >
                <LayoutDashboard size={16} />
                My Dashboard
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={16} />
                Lodge Admin
              </Link>
            </>
          )}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => { toggleAuth(); setMenuOpen(false); }}
              className="w-full text-center bg-gold text-navy font-semibold py-2.5 rounded-lg text-sm"
            >
              {isLoggedIn ? "Sign Out (Demo)" : "Sign In (Demo)"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
