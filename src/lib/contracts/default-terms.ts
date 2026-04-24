// ── Default legal + payment terms for fence contractor quotes ──
// Based on the standard 13-clause contractor agreement pattern used
// by established Florida residential fence contractors (Florida State
// Fence, etc.). Contractors can override these by entering their own
// text in Settings. The customer-facing share quote and the signed
// contract PDF fall back to these defaults when the org hasn't
// customized.
//
// Keep the content in one place so updates flow everywhere — the
// quote acceptance ceremony snapshots whichever text is live at
// generate-link time.

export const DEFAULT_PAYMENT_TERMS = `Payment schedule:
- 50% deposit due upon acceptance. Materials are ordered only after the deposit clears.
- Remaining 50% due upon completion of installation.
- Any balance not paid within 10 days of completion accrues a finance charge of 1.5% per month on the unpaid balance.
- Card payments carry an additional 3.5% convenience fee. Cash, check, or ACH preferred.

Scheduling:
- Installation date is confirmed after the deposit is received and the material order is placed.
- If the project is delayed longer than 2 weeks due to factors outside of our control, the balance of allocated materials may be invoiced immediately.

Changes after order:
- If the scope, footage, or material type changes after materials have been allocated, a restocking fee of up to 25% may apply on the unused materials.
`.trim();

export const DEFAULT_LEGAL_TERMS = `1. Scope. The scope of work, materials, and pricing described in this quote constitute the complete agreement between the contractor and customer. Any change in layout, footage, materials, or site conditions may result in a price adjustment and, if applicable, a rescheduled installation date.

2. HOA approvals. The customer is solely responsible for obtaining any required Homeowners Association, Architectural Review Board, or community approvals for the type, style, color, and location of the fence. The contractor can provide documentation (insurance certificate, scope letter, material specifications) upon request.

3. Property lines and plot plan. The customer must provide a current plot plan or boundary survey establishing the fence installation location. If a survey is not provided, the customer takes full responsibility for the fence location and waives any claim related to boundary disputes.

4. Utilities and irrigation. The contractor will contact the state's underground-utility-locate service ("Sunshine 811" or equivalent) prior to installation. The contractor is not liable for damage to unmarked utilities, private utility lines, or sprinkler / irrigation lines, whether marked or unmarked.

5. Site preparation. The customer is responsible for removing all vegetation, debris, and obstructions along the fence line prior to the installation date. If the site is not ready on the day of install, a remobilization charge of up to $600 may apply.

6. Permits. Price does not include the cost of any permits required by the local jurisdiction unless explicitly noted in the scope of work. Permits, when required, are the customer's responsibility.

7. Warranty. Labor carries a one-year warranty from the date of completion. Materials carry the manufacturer's warranty per product terms. Warranty excludes damage from acts of nature, soil settling, vehicle impact, pets, or modifications made by anyone other than the contractor.

8. Materials and ownership. All materials remain the property of the contractor until full payment is received. Right of access and removal is granted to the contractor in the event of nonpayment, per the terms of this contract.

9. Wood products. The contractor does not warranty wood fence products beyond the manufacturer's terms. Wood will naturally weather, check, cup, and change color over time; these characteristics are not warranty defects.

10. Cancellation and restocking. If the customer cancels or changes materials after the contractor has placed the supplier order, the customer may be responsible for a restocking fee of up to 25% of the affected materials.

11. Collections. In the event the contractor retains an attorney to collect amounts owed, the customer shall be liable for reasonable attorneys' fees, expenses, and court costs incurred prior to, during, and after any legal action, including appeals.

12. Financing. Third-party financing may be available through partner lenders. Ask the contractor for current options. Approval, rate, and terms are determined by the lender, not the contractor.

13. Governing law. This agreement is governed by the laws of the state where the installation is performed. Venue for any dispute shall be the county of the installation address.
`.trim();
