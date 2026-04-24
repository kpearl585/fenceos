// ── Customer Proposal PDF ─────────────────────────────────────────
// Clean, professional proposal for the homeowner.
// No cost exposure — shows scope, bid price, signature line.

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { FenceEstimateResult } from "./types";

const BRAND = "#2D6A4F";
const GRAY = "#6B7280";
const LIGHT = "#F3F4F6";
const DARK = "#111827";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: DARK, padding: 48, backgroundColor: "#fff" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  logoBlock: { flex: 1 },
  logoText: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
  tagline: { fontSize: 9, color: GRAY, marginTop: 3 },
  contactBlock: { alignItems: "flex-end" },
  contactLine: { fontSize: 9, color: GRAY, marginBottom: 1 },

  // Title strip
  titleStrip: { backgroundColor: BRAND, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 24, borderRadius: 4 },
  titleText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#fff", textAlign: "center", letterSpacing: 1.5 },

  // Two-column layout
  cols: { flexDirection: "row", gap: 24, marginBottom: 24 },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },

  // Sections
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, borderBottom: `0.5pt solid ${BRAND}`, paddingBottom: 3 },
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { fontSize: 9, color: GRAY, width: 80, flexShrink: 0 },
  fieldValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, flex: 1 },
  fieldValuePlain: { fontSize: 9, color: DARK, flex: 1 },

  // Scope table
  scopeHeader: { flexDirection: "row", backgroundColor: BRAND, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 1 },
  scopeTh: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fff" },
  scopeRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottom: `0.5pt solid ${LIGHT}` },
  scopeRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottom: `0.5pt solid ${LIGHT}`, backgroundColor: "#FAFAFA" },
  scopeTd: { fontSize: 9, color: DARK, flex: 2 },
  scopeTdRight: { fontSize: 9, color: DARK, flex: 1, textAlign: "right" },

  // Price summary
  priceBox: { backgroundColor: BRAND, borderRadius: 4, padding: 16, marginBottom: 24 },
  priceLabel: { fontSize: 10, color: "#A7D7B8", marginBottom: 4 },
  priceValue: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#fff" },
  pricePerLF: { fontSize: 9, color: "#A7D7B8", marginTop: 4 },

  // Terms
  termsBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 24 },
  termsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 },
  termLine: { fontSize: 8, color: GRAY, marginBottom: 3 },

  // Signature block
  sigSection: { marginBottom: 24 },
  sigRow: { flexDirection: "row", gap: 24, marginBottom: 12 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottom: `1pt solid ${DARK}`, marginBottom: 4, height: 32 },
  sigLabel: { fontSize: 8, color: GRAY },

  // Footer
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, borderTop: `0.5pt solid ${LIGHT}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },
});

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export interface ProposalData {
  result: FenceEstimateResult;
  projectName: string;
  fenceType: string;
  bidPrice: number;
  markupPct: number;
  totalLF: number;
  // Org / contractor info
  orgName: string;
  orgPhone?: string;
  orgEmail?: string;
  orgAddress?: string;
  logoUrl?: string;
  // Customer info
  customerName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPhone?: string;
  customerEmail?: string;
  // Meta
  date: string;
  proposalNumber?: string;
  validDays?: number;
  // Timeline
  estimatedStartDate?: string;
  estimatedDurationDays?: number;
}

const FENCE_TYPE_LABELS: Record<string, string> = {
  vinyl: "Vinyl",
  wood: "Wood",
  chain_link: "Chain Link",
  aluminum: "Aluminum / Ornamental",
};

export function CustomerProposalPdf({ data }: { data: ProposalData }) {
  const { result, projectName, fenceType, bidPrice, totalLF, orgName, orgPhone, orgEmail, orgAddress,
    customerName, customerAddress, customerCity, customerPhone, customerEmail, date, proposalNumber, validDays = 30,
    estimatedStartDate, estimatedDurationDays } = data;

  const typeLabel = FENCE_TYPE_LABELS[fenceType] ?? fenceType;
  // Post count is derived from the BOM's true post SKUs (excluding post
  // sleeves and caps, which also live in the "posts" category) rather
  // than graph.nodes.length, so chain-link proposals don't leak the
  // builder's phantom 96"-OC posts (BOM uses config 120"-OC).
  const postCountFromBom = result.bom
    .filter(b => b.category === "posts" && b.sku.includes("POST")
      && !b.sku.includes("SLEEVE") && !b.sku.includes("CAP"))
    .reduce((sum, b) => sum + (b.qty ?? 0), 0);
  const postCount = postCountFromBom > 0 ? postCountFromBom : result.graph.nodes.length;
  const gateCount = result.graph.edges.filter(e => e.type === "gate").length;
  const runCount = result.graph.edges.filter(e => e.type === "segment").length;
  const perLF = totalLF > 0 ? Math.round(bidPrice / totalLF) : 0;

  // Simplified scope line items (no cost exposure)
  const scopeItems = [
    { desc: `${typeLabel} Fence Installation`, detail: `${typeLabel} fence, professional grade`, qty: `${totalLF} LF` },
    { desc: "Post Setting with Concrete Footings", detail: `${postCount} posts, volumetric concrete per post`, qty: `${postCount} posts` },
    ...(gateCount > 0 ? [{ desc: "Gate Installation", detail: `${gateCount} gate(s), heavy-duty hardware`, qty: `${gateCount} gate(s)` }] : []),
    { desc: "Material Procurement & Delivery", detail: "All materials included", qty: "Included" },
    { desc: "Site Cleanup & Debris Removal", detail: "Post-installation cleanup", qty: "Included" },
  ];

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <Text style={s.logoText}>{orgName}</Text>
            <Text style={s.tagline}>Professional Fence Installation</Text>
          </View>
          <View style={s.contactBlock}>
            {orgPhone && <Text style={s.contactLine}>{orgPhone}</Text>}
            {orgEmail && <Text style={s.contactLine}>{orgEmail}</Text>}
            {orgAddress && <Text style={s.contactLine}>{orgAddress}</Text>}
          </View>
        </View>

        {/* Title */}
        <View style={s.titleStrip}>
          <Text style={s.titleText}>FENCE INSTALLATION PROPOSAL</Text>
        </View>

        {/* Proposal + Customer info */}
        <View style={s.cols}>
          <View style={s.colLeft}>
            <Text style={s.sectionLabel}>Proposal Details</Text>
            {proposalNumber && (
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Proposal #</Text>
                <Text style={s.fieldValue}>{proposalNumber}</Text>
              </View>
            )}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Date</Text>
              <Text style={s.fieldValue}>{date}</Text>
            </View>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Valid For</Text>
              <Text style={s.fieldValue}>{validDays} days</Text>
            </View>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Project</Text>
              <Text style={s.fieldValue}>{projectName}</Text>
            </View>
          </View>
          <View style={s.colRight}>
            <Text style={s.sectionLabel}>Prepared For</Text>
            {customerName ? (
              <>
                <View style={s.fieldRow}><Text style={s.fieldValue}>{customerName}</Text></View>
                {customerAddress && <View style={s.fieldRow}><Text style={s.fieldValuePlain}>{customerAddress}</Text></View>}
                {customerCity && <View style={s.fieldRow}><Text style={s.fieldValuePlain}>{customerCity}</Text></View>}
                {customerPhone && <View style={s.fieldRow}><Text style={s.fieldLabel}>Phone</Text><Text style={s.fieldValuePlain}>{customerPhone}</Text></View>}
                {customerEmail && <View style={s.fieldRow}><Text style={s.fieldLabel}>Email</Text><Text style={s.fieldValuePlain}>{customerEmail}</Text></View>}
              </>
            ) : (
              <Text style={{ fontSize: 9, color: GRAY }}>—</Text>
            )}
          </View>
        </View>

        {/* Scope of Work */}
        <View style={{ marginBottom: 24 }}>
          <Text style={s.sectionLabel}>Scope of Work</Text>
          <View style={s.scopeHeader}>
            <Text style={[s.scopeTh, { flex: 2 }]}>Description</Text>
            <Text style={[s.scopeTh, { flex: 2 }]}>Detail</Text>
            <Text style={[s.scopeTh, { flex: 1, textAlign: "right" }]}>Quantity</Text>
          </View>
          {scopeItems.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.scopeRow : s.scopeRowAlt}>
              <Text style={s.scopeTd}>{item.desc}</Text>
              <Text style={[s.scopeTd, { color: GRAY }]}>{item.detail}</Text>
              <Text style={s.scopeTdRight}>{item.qty}</Text>
            </View>
          ))}
        </View>

        {/* Timeline & Warranty */}
        {(estimatedStartDate || estimatedDurationDays) && (
          <View style={s.cols}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>Project Timeline</Text>
              <View style={s.termsBox}>
                {estimatedStartDate && (
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>Est. Start:</Text>
                    <Text style={s.fieldValue}>{estimatedStartDate}</Text>
                  </View>
                )}
                {estimatedDurationDays && (
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>Duration:</Text>
                    <Text style={s.fieldValue}>{estimatedDurationDays} {estimatedDurationDays === 1 ? 'day' : 'days'}</Text>
                  </View>
                )}
                <Text style={[s.termLine, { marginTop: 8 }]}>Timeline may vary due to weather conditions or permit delays.</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>Warranty Information</Text>
              <View style={s.termsBox}>
                {/* Must match quotePackage.DEFAULT_TERMS warranty clause */}
                <Text style={s.termLine}>Workmanship: 1 year from completion</Text>
                <Text style={s.termLine}>Materials: Manufacturer warranty per product terms</Text>
                <Text style={s.termLine}>Excludes: Acts of nature, soil settling, unauthorized modifications</Text>
                <Text style={[s.termLine, { marginTop: 8, fontSize: 7 }]}>Full warranty details provided upon project completion.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Price */}
        <View style={s.cols}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Investment Summary</Text>
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Total Project Investment</Text>
              <Text style={s.priceValue}>{fmt(bidPrice)}</Text>
              <Text style={s.pricePerLF}>{fmt(perLF)} per linear foot · {totalLF} LF total</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Terms & Conditions</Text>
            <View style={s.termsBox}>
              <Text style={s.termsTitle}>Standard Terms</Text>
              <Text style={s.termLine}>50% deposit required to schedule installation.</Text>
              <Text style={s.termLine}>Balance due upon project completion.</Text>
              <Text style={s.termLine}>All permits (if required) are the responsibility of the property owner unless otherwise agreed.</Text>
              <Text style={s.termLine}>Underground utility marking (811) must be completed before installation begins.</Text>
              <Text style={s.termLine}>This proposal is valid for {validDays} days from the date above.</Text>
              <Text style={s.termLine}>Prices subject to change if material costs increase significantly.</Text>
            </View>
          </View>
        </View>

        {/* Next Steps */}
        <View style={{ marginBottom: 24, backgroundColor: '#F0F9FF', borderRadius: 4, padding: 14, borderLeft: `3pt solid ${BRAND}` }}>
          <Text style={[s.sectionLabel, { borderBottom: 'none', marginBottom: 8 }]}>Ready to Get Started?</Text>
          <Text style={{ fontSize: 9, color: DARK, marginBottom: 6, fontFamily: 'Helvetica-Bold' }}>Here's what happens next:</Text>
          <Text style={[s.termLine, { marginBottom: 4 }]}>✓  Review this proposal and sign below</Text>
          <Text style={[s.termLine, { marginBottom: 4 }]}>✓  Submit 50% deposit to secure your installation date</Text>
          <Text style={[s.termLine, { marginBottom: 4 }]}>✓  We'll schedule your installation and handle all materials</Text>
          <Text style={[s.termLine, { marginBottom: 8 }]}>✓  Project completion with final walkthrough</Text>
          <Text style={{ fontSize: 9, color: DARK, marginTop: 6 }}>
            Questions? Call {orgPhone || 'us'} or email {orgEmail || 'support@fenceestimatepro.com'}
          </Text>
        </View>

        {/* Signature */}
        <View style={s.sigSection}>
          <Text style={s.sectionLabel}>Acceptance</Text>
          <Text style={{ fontSize: 9, color: GRAY, marginBottom: 16 }}>
            By signing below, you authorize {orgName} to proceed with the work described in this proposal at the price stated above.
          </Text>
          <View style={s.sigRow}>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Customer Signature</Text>
            </View>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Print Name</Text>
            </View>
            <View style={[s.sigBlock, { flex: 0.6 }]}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Date</Text>
            </View>
          </View>
          <View style={s.sigRow}>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Contractor Signature ({orgName})</Text>
            </View>
            <View style={[s.sigBlock, { flex: 0.6 }]}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{orgName} · Powered by FenceEstimatePro</Text>
          <Text style={s.footerText}>Proposal generated {date} · Valid {validDays} days · fenceestimatepro.com/terms</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 16, left: 48, right: 48 }}>
          <Text style={{ fontSize: 6, color: GRAY, textAlign: 'center' }}>
            Estimates are based on information provided and standard installation conditions. Final costs may vary due to site-specific conditions, unforeseen obstacles, or material price changes. Contractor is not liable for underground utilities not marked by 811 or property line discrepancies.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
