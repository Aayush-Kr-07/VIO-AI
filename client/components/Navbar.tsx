"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoggedIn, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;
  const navLinks = isLoggedIn
    ? [
        { href: "/dashboard", label: "Dashboard", icon: "⚡️" },
        { href: "/practice", label: "Practice", icon: "🎯" },
        { href: "/challenges", label: "Challenges", icon: "🏆" },
        { href: "/history", label: "My Sessions", icon: "📊" },
        { href: "/security", label: "Security", icon: "🔐" },
      ]
    : [
        { href: "/#features", label: "Features", icon: "✨" },
        { href: "/#how-it-works", label: "How It Works", icon: "🧐" },
        { href: "/#domains", label: "Domains", icon: "🧩" },
      ];

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <header className="border-b border-blue-100 bg-white/95 px-3 py-3 shadow-sm sm:px-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="logo">
          <span className="logo-mark h-10 w-10 text-sm sm:h-11 sm:w-11 sm:text-base">VIO</span>
          <div className="logo-text">
            <span className="logo-primary">VIO AI</span>
            <span className="logo-sub hidden sm:block"><p>Talk to VioAI. Get Hired Tomorrow.</p></span>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${isActive(link.href) ? "font-semibold text-blue-700" : "text-slate-600 hover:text-blue-600"}`}>
              <span className="mr-2">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          {isLoggedIn && user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {initial}
                </span>
                <span className="text-sm font-medium text-blue-950">{firstName}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              Login
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl transition hover:bg-blue-50 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-5 rounded-full bg-blue-700 transition-all duration-300 ${
              mobileOpen ? "translate-y-1.5 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-blue-700 transition-all duration-300 ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-blue-700 transition-all duration-300 ${
              mobileOpen ? "-translate-y-1.5 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2 border-t border-gray-200 bg-white px-2 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                isActive(link.href)
                  ? "bg-violet-50 font-semibold text-violet-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {isLoggedIn && user ? (
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{firstName}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <Link href="/login" className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                Login
              </Link>
              <Link href="/register" className="block w-full rounded-xl bg-violet-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-violet-500">
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
