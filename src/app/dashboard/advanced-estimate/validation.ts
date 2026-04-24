// Pre-convert validation for "create estimate / send to customer".
//
// Kept pure so the contract — which field fails first and what message
// the user sees — can be unit-tested without jsdom. The hook calls this
// and handles the scroll/focus DOM side effects separately.

export interface ConvertValidationInput {
  projectName: string;
  customerName: string;
}

export interface ConvertValidationError {
  /** DOM id the caller should scroll to and focus. */
  fieldId: "est-project-name" | "est-cust-name";
  /** Copy shown in the inline error banner. */
  message: string;
}

// Returns null when the estimate is OK to convert. Otherwise returns
// the first-failing field + message. Order matters: we surface project
// name first because a missing customer is often discovered only after
// the user has already named the quote.
export function validateEstimateBeforeConvert(
  input: ConvertValidationInput,
): ConvertValidationError | null {
  const trimmedName = input.projectName.trim();
  if (!trimmedName || trimmedName.toLowerCase() === "new estimate") {
    return {
      fieldId: "est-project-name",
      message: "Give this estimate a name before creating the quote.",
    };
  }
  if (!input.customerName.trim()) {
    return {
      fieldId: "est-cust-name",
      message: "Enter a customer name above before creating an estimate.",
    };
  }
  return null;
}
