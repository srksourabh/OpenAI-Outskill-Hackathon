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
    <header className="border-b border-white/40 bg-surface text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link className="rounded-md bg-accent px-3 py-2 text-lg font-black text-ink" href="/">
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
              <span className="rounded-md border border-white px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">{session.role}</span>
              <button className="rounded-md bg-white px-3 py-2 font-semibold text-ink" onClick={logout} type="button">
                Sign out
              </button>
            </>
          ) : (
            <Link className="rounded-md bg-white px-3 py-2 font-semibold text-ink" href="/login">
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
    <Link className={`rounded-md px-3 py-2 ${active ? "bg-white font-bold text-ink" : "text-white hover:bg-white/15"}`} href={href}>
      {label}
    </Link>
  );
}
