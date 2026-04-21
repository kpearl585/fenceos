"use client";

// Confirm-then-submit button for the account deletion flow. Lives in its
// own client component because the onClick handler can't be attached
// directly to a DOM element rendered from a Server Component under
// Next.js 16 (strict enforcement of the client/server boundary — older
// versions warned silently, v16 throws "Event handlers cannot be passed
// to Client Component props" and trips the dashboard error boundary).
//
// The `action` prop accepts the deleteAccount server action, preserving
// the original data-mutation path (server action form submit). If the
// user declines either confirmation, we preventDefault and the form
// never submits.

import { useRef } from "react";

interface Props {
  action: (fd: FormData) => Promise<void> | void;
}

export default function DeleteAccountButton({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (
      !confirm(
        "Are you absolutely sure you want to delete your account? This action CANNOT be undone. All your data will be permanently deleted after 30 days.\n\nType DELETE in the next prompt to confirm."
      )
    ) {
      e.preventDefault();
      return;
    }
    const confirmation = prompt("Type DELETE to confirm account deletion:");
    if (confirmation !== "DELETE") {
      e.preventDefault();
      alert("Account deletion cancelled. Confirmation did not match.");
    }
  }

  return (
    <form ref={formRef} action={action} className="ml-4">
      <button
        type="submit"
        onClick={handleClick}
        className="bg-danger hover:bg-danger/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap"
      >
        Delete Account
      </button>
    </form>
  );
}
