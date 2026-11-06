"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import LeadHubBrandLockup from "../../components/common/LeadHubBrandLockup";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";

/**
 * Week 1 onboarding: one required question — "What do you sell?"
 * Maps to company products + description for Prospect brief openers later.
 * ICP / niches APIs remain available but are not called from this UI.
 */
export default function OnboardingPage() {
  const {
    user,
    loading: authLoading,
    refreshOnboardingStatus,
    onboardingStep,
    onboardingLoading,
  } = useAuth();
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [whatYouSell, setWhatYouSell] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?from=/onboarding");
    } else if (!authLoading && user && !user.emailVerifiedAt) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!onboardingLoading && onboardingStep === "completed") {
      router.replace("/research");
    }
  }, [onboardingLoading, onboardingStep, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sell = whatYouSell.trim();
    if (!sell) {
      toast.error("Tell us what you sell so we can draft better openers.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/onboarding/company", {
        companyName: companyName.trim() || "My workspace",
        description: sell,
        products: [sell],
      });
      await api.post("/api/onboarding/complete");
      await refreshOnboardingStatus();
      toast.success("You are ready to run your first recipe.");
      router.push("/research?sample=1");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error(message ?? "Could not finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || onboardingLoading || onboardingStep === "completed") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-main border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-100 p-6 text-text">
      <div className="z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <LeadHubBrandLockup size={36} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Quick setup
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          What do you sell?
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          One line is enough. We use it to personalize openers in your Prospect
          brief recipe.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="whatYouSell"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              What do you sell? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="whatYouSell"
              required
              rows={3}
              value={whatYouSell}
              onChange={(e) => setWhatYouSell(e.target.value)}
              placeholder="e.g. B2B sales engagement software for SDR teams"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-brand-main/30 placeholder:text-slate-400 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Company or workspace name{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="My workspace"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-brand-main/30 placeholder:text-slate-400 focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !whatYouSell.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-main px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? (
              <IconLoader2 className="animate-spin" size={16} />
            ) : (
              <IconSparkles size={16} />
            )}
            Continue to recipes
          </button>
        </form>
      </div>
    </main>
  );
}
