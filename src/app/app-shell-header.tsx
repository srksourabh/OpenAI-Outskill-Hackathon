"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type SessionState = {
  authenticated: boolean;
  role: "admin" | "user" | null;
};

export function AppShellHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ authenticated: false, role: null });

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: SessionState) => {
        if (!ignore) setSession(data);
      })
      .catch(() => {
        if (!ignore) setSession({ authenticated: false, role: null });
      });
    return () => {
      ignore = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[#D1D8E0] bg-[#E0E5EC] text-[#3D4852]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link className="rounded-2xl bg-[#6C63FF] px-4 py-3 text-lg font-black text-white shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]" href="/">
            eDial
          </Link>
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <TopLink href="/campaigns" label="Campaigns" pathname={pathname} />
            <TopLink href="/health" label="Health" pathname={pathname} />
            <TopLink href="/privacy" label="Privacy" pathname={pathname} />
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {session.authenticated ? (
            <>
              <span className="rounded-2xl bg-[#E0E5EC] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#6C63FF] shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">{session.role}</span>
              <button className="rounded-2xl bg-[#E0E5EC] px-4 py-3 font-semibold text-[#3D4852] shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]" onClick={logout} type="button">
                Sign out
              </button>
            </>
          ) : (
            <Link className="rounded-2xl bg-[#E0E5EC] px-4 py-3 font-semibold text-[#3D4852] shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function TopLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname.startsWith(href);
  return (
    <Link className={`rounded-2xl px-4 py-3 ${active ? "bg-[#E0E5EC] font-bold text-[#3D4852] shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]" : "text-[#6B7280] hover:text-[#3D4852]"}`} href={href}>
      {label}
    </Link>
  );
}
