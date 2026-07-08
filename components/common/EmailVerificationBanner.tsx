"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { BodyPortal } from "@/components/ui/BodyPortal";
import { useAuth } from "@/context/AuthContext";
import { IconMail, IconRefresh, IconX } from "@tabler/icons-react";

const resendVerificationCode = async () => {
  // Stub function as this component is not actively used or integrated.
  return Promise.resolve();
};

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
  variant?: "banner" | "modal";
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onDismiss,
  variant = "banner",
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is verified or banner is dismissed
  if (user?.emailVerifiedAt || isDismissed) {
    return null;
  }

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await resendVerificationCode();
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      console.error("Failed to resend verification code:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyEmail = () => {
    router.push("/verify-email");
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (variant === "modal") {
    return (
      <BodyPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <IconMail className="h-6 w-6 text-[var(--primary-200)] mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Verify Your Email
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Please verify your email address to access all Leadsnipper features
            and receive your welcome credits.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleVerifyEmail}
              className="w-full bg-[var(--primary-200)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--primary-300)] transition-colors"
            >
              Verify Email Now
            </button>

            <button
              onClick={handleResendCode}
              disabled={isResending}
              className="w-full bg-white text-[var(--primary-200)] py-3 px-4 rounded-lg font-medium border border-[var(--primary-200)] hover:bg-[var(--primary-200)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center">
                <IconRefresh
                  className={`h-4 w-4 mr-2 ${
                    isResending ? "animate-spin" : ""
                  }`}
                />
                {isResending ? "Sending..." : "Resend Code"}
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Sent to: {user?.email}
          </p>
        </div>
      </div>
      </BodyPortal>
    );
  }

  // Banner variant - readable on light page backgrounds
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <IconMail className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-sm font-medium text-amber-950">
            Verify your email to unlock all features
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleVerifyEmail}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            Verify Now
          </button>
          <button
            onClick={handleResendCode}
            disabled={isResending}
            className="text-xs font-medium text-amber-800 transition-colors hover:text-amber-950 disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend"}
          </button>
          <button
            onClick={handleDismiss}
            className="ml-1 text-amber-700/70 transition-colors hover:text-amber-900"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
