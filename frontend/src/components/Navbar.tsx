"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Brain,
  BookHeart,
  SmilePlus,
  Users,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Brain },
  { href: "/journal", label: "Journal", icon: BookHeart },
  { href: "/mood", label: "Mood", icon: SmilePlus },
  { href: "/connections", label: "Connections", icon: Users },
  { href: "/profile", label: "My Twin", icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)]" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-[var(--color-text)]">
            Neuro<span className="text-[var(--color-primary)]">Twin</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--color-primary-light)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          {/* Logout button */}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors ml-2"
              title={`Logged in as ${user.displayName}`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Log out</span>
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          aria-expanded={open}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white px-4 pb-4 pt-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--color-primary-light)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-slate-50"
                )}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
          {user && (
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full mt-2"
            >
              <LogOut className="w-5 h-5" />
              Log out ({user.displayName})
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
