"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    window.setTimeout(() => {
      if (email.trim().toLowerCase() === "admin@vault.demo" && password === "demo1234") {
        router.push("/dashboard");
      } else {
        setError("Access denied. Check the demonstration credentials.");
        setLoading(false);
      }
    }, 700);
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
      <section className="flex min-h-[250px] flex-col justify-between border-b hairline p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-14">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[.1em]">
          <span className="flex size-9 items-center justify-center border border-white/40"><LockKeyhole size={18} aria-hidden="true" /></span>
          SRV / CONTROL
        </div>
        <div className="max-w-3xl py-12">
          <p className="technical-label mb-5">Administrative access / Mock environment</p>
          <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] tracking-[-.08em]">SMART ROTARY<br />& TAMPER VAULT</h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-muted">
            Security telemetry and remote administration interface. This demonstration does not connect to physical hardware.
          </p>
        </div>
        <p className="technical-label">System / Vault 01</p>
      </section>
      <section className="flex items-center px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <p className="technical-label mb-4">01 / Sign in</p>
          <h2 className="text-2xl font-medium">Administrator login</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Use the public demonstration credentials below.</p>
          <form onSubmit={signIn} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="technical-label mb-2 block">Email address</label>
              <input id="email" name="email" type="email" autoComplete="username" required value={email}
                onChange={(event) => setEmail(event.target.value)} className="field" placeholder="admin@vault.demo" />
            </div>
            <div>
              <label htmlFor="password" className="technical-label mb-2 block">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required value={password}
                onChange={(event) => setPassword(event.target.value)} className="field" placeholder="Enter password" />
            </div>
            {error && <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="h-12 w-full text-xs">{loading ? "Signing in..." : "Sign in to dashboard"}</Button>
          </form>
          <div className="mt-7 border-t hairline pt-5 text-xs leading-6 text-muted">
            <p>DEMO EMAIL: <span className="text-foreground">admin@vault.demo</span></p>
            <p>DEMO PASSWORD: <span className="text-foreground">demo1234</span></p>
            <p className="mt-3">Mock sign-in only. No authentication session is created.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
