import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { WiseLogo } from "@/components/wise-logo";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | ONEWISE AI" },
      { name: "description", content: "Get help with the ONEWISE AI Voice Agent Dashboard and mobile app." },
      { property: "og:title", content: "Support | ONEWISE AI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

const CONTACT_EMAIL = "support@onewise.ca";

function SupportPage() {
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
        <h1 className="font-display text-3xl font-bold text-foreground">Support</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Need help signing in, reviewing calls, or something isn't working as expected? Reach us directly and we'll get
          back to you.
        </p>

        <div className="mt-8 space-y-4 text-sm">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 font-medium text-foreground shadow-card transition-colors hover:border-primary/40"
          >
            <Mail className="size-4 text-primary" /> {CONTACT_EMAIL}
          </a>

          <p className="text-muted-foreground">
            Accounts are created and managed by your organization's administrator. If you've forgotten your password,
            use the{" "}
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              reset link
            </Link>{" "}
            on the sign-in page, or contact your administrator to have access restored.
          </p>

          <p className="text-muted-foreground">
            See also our{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
