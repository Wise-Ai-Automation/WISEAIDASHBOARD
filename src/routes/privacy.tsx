import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { WiseLogo } from "@/components/wise-logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | ONEWISE AI" },
      { name: "description", content: "How ONEWISE AI collects, uses and protects data in the Voice Agent Dashboard and mobile app." },
      { property: "og:title", content: "Privacy Policy | ONEWISE AI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const EFFECTIVE_DATE = "October 31, 2026";
const CONTACT_EMAIL = "support@onewise.ca";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <WiseLogo subtitle="Voice Agent Dashboard" />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          <p className="text-muted-foreground">
            ONEWISE AI Inc. ("ONEWISE AI", "we", "us") operates the Voice Agent Dashboard web application and its companion
            mobile app (together, the "Service"). This policy explains what data the Service collects, how it's used, and
            who it's shared with.
          </p>

          <section>
            <h2>What we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Account information</strong> — your name, email address and password, handled by our authentication provider (Supabase). We never see or store your password in plain text.</li>
              <li><strong className="text-foreground">Authorization data</strong> — your role (admin or subaccount) and which voice agents you're allowed to view, so the Service can show you the right data.</li>
              <li><strong className="text-foreground">Voice agent data</strong> — call recordings, transcripts, summaries and analytics are retrieved live from our voice platform, Retell AI, and displayed to you based on your access. We do not keep a separate copy of this call data in our own database.</li>
            </ul>
          </section>

          <section>
            <h2>What we don't do</h2>
            <p>
              We don't run advertising, third-party analytics, or tracking SDKs in the Service. We don't sell your data,
              and we don't share it with anyone beyond the service providers below that are necessary to operate the
              Service.
            </p>
          </section>

          <section>
            <h2>Who we share data with</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Supabase</strong> — authentication and database hosting for account and authorization data.</li>
              <li><strong className="text-foreground">Retell AI</strong> — the voice agent platform that places/receives calls and generates recordings, transcripts and analytics.</li>
            </ul>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              Data is encrypted in transit (HTTPS/TLS). Access is role-based: subaccounts can only see the voice agents
              assigned to them, and pricing/billing information is restricted to administrators across every page, export
              and API response.
            </p>
          </section>

          <section>
            <h2>Data retention</h2>
            <p>
              Account, role and agent-assignment records are kept for as long as your account is active, and removed when
              an administrator deletes it. Call recordings, transcripts and related voice data are retained according to
              Retell AI's own retention settings, since the Service does not independently store them.
            </p>
          </section>

          <section>
            <h2>Children's privacy</h2>
            <p>The Service is a business tool and is not directed at, or intended for use by, children.</p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              Accounts are created and managed by your organization's administrator. To access, correct or delete your
              personal information, contact your administrator or reach us directly at the email below.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>If this policy changes, we'll update the effective date above.</p>
          </section>

          <section>
            <h2>Contact us</h2>
            <p>
              Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
