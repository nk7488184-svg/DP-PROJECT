"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Laptop,
} from "lucide-react";
import AdminAuthModal, { AdminUser } from "./AdminAuthModal";
import { cn } from "@/lib/utils";

export default function AdminUserMenu() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize from localStorage or default to working admin session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("campus_safety_admin_user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Default initial session is logged in as standard admin, but can log out or switch to Google anytime!
        const defaultAdmin: AdminUser = {
          id: "usr_admin_001",
          name: "IIT Mandi Admin",
          username: "admin",
          email: "admin@iitmandi.ac.in",
          role: "Super Administrator",
          department: "Campus Safety & Edge Enforcement",
          campus: "IIT Mandi (Kamand)",
          authProvider: "credentials",
          token: "jwt_admin_token_active",
        };
        setUser(defaultAdmin);
        localStorage.setItem("campus_safety_admin_user", JSON.stringify(defaultAdmin));
      }
    } catch {
      // Ignore storage errors
    }

    // Close dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("campus_safety_admin_user");
      localStorage.removeItem("token");
    } catch {}
    setUser(null);
    setIsDropdownOpen(false);
  };

  const handleLoginSuccess = (loggedInUser: AdminUser) => {
    setUser(loggedInUser);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {user ? (
          /* LOGGED IN USER PILL */
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card hover:bg-card-hover border border-border hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-sm group select-none"
            aria-label="Open Admin Menu"
          >
            {/* Avatar with status dot */}
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm">
                {user.authProvider === "google" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                ) : (
                  <Shield className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-card animate-pulse" />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                {user.name.split(" ")[0]}
              </span>
              <span className="text-[10px] text-muted font-mono leading-none">
                {user.authProvider === "google" ? "Google ID" : "Admin"}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors ml-0.5" />
          </button>
        ) : (
          /* LOGGED OUT LOGIN BUTTON */
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/50 text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        )}

        {/* DROPDOWN MENU */}
        {isDropdownOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Header info */}
            <div className="p-4 bg-gradient-to-b from-primary/10 to-transparent border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                  {user.authProvider === "google" ? "G" : "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{user.name}</div>
                  <div className="text-xs text-muted font-mono truncate">{user.email}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Location Details */}
            <div className="p-3 border-b border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted">
                <span>Auth Provider:</span>
                <span className="font-semibold text-foreground capitalize flex items-center gap-1">
                  {user.authProvider === "google" ? "Google OAuth 2.0" : "Credentials"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Active Hub:</span>
                <span className="text-foreground font-medium flex items-center gap-1 truncate max-w-[140px]" title="Behind A11 on New Construction Road">
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  Behind A11
                </span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Session Clearance:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Full Superadmin
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-card-hover transition-colors text-left"
              >
                <KeyRound className="w-3.5 h-3.5 text-muted" />
                <span>Switch Account / Sign In with Google</span>
              </button>

              <Link
                href="/login"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-orange-400 hover:bg-orange-500/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 115 48" fill="none">
                    <path
                      d="M87.2 24.3c-.6-4.9-4.8-8.7-9.8-8.7-2.3 0-4.4.8-6.1 2.2-2.3-6.6-8.6-11.3-16-11.3-8.8 0-16.1 6.5-17.3 15-2.2-.8-4.6-1.1-7.1-.8-5.7.8-10.2 5.3-11 11-.3 1.9-.1 3.7.5 5.4H90.8c3.9 0 7.1-3.2 7.1-7.1 0-2.8-1.7-5.3-4.2-6.5l-6.5.8z"
                      fill="#F38020"
                    />
                    <path
                      d="M93.3 29.8c-.5-3.3-3.3-5.8-6.7-5.8-1.5 0-2.9.5-4.1 1.4-1.6-4.5-5.9-7.7-10.9-7.7-5.9 0-10.8 4.3-11.6 10-.7-.2-1.5-.3-2.3-.3h-3.4l-.3 1.2c-.3 1.1-.4 2.2-.4 3.4 0 .9.1 1.7.3 2.5h33.8c2.6 0 4.7-2.1 4.7-4.7z"
                      fill="#FAAD3F"
                    />
                  </svg>
                  <span>Cloudflare Zero Trust Login</span>
                </div>
                <ExternalLink className="w-3 h-3 text-orange-400/70" />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LOGIN MODAL */}
      <AdminAuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
