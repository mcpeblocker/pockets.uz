import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

export const metadata = {
  title: "Verify Email - Pockets",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-700">Verifying your email…</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}

