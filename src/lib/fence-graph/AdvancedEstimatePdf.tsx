// ── Advanced Estimate PDF ─────────────────────────────────────────
// @react-pdf/renderer BOM report for the FenceGraph engine output

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { FenceEstimateResult } from "./types";

const BRAND = "#2D6A4F";
const GRAY = "#6B7280";
const LIGHT = "#F3F4F6";
const DARK = "#111827";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, padding: 36, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, borderBottom: `2pt solid ${BRAND}`, paddingBottom: 10 },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BRAND },
  subBrand: { fontSize: 9, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerLabel: { fontSize: 8, color: GRAY },
  headerValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, borderBottom: `0.5pt solid ${BRAND}`, paddingBottom: 3 },

  row: { flexDirection: "row", borderBottom: `0.5pt solid ${LIGHT}`, paddingVertical: 4 },
  rowAlt: { flexDirection: "row", borderBottom: `0.5pt solid ${LIGHT}`, paddingVertical: 4, backgroundColor: "#FAFAFA" },
  tableHeader: { flexDirection: "row", backgroundColor: BRAND, paddingVertical: 5, marginBottom: 1 },

  col: { flex: 1 },
  colNarrow: { width: 48 },
  colWide: { flex: 2 },
  colNum: { width: 56, textAlign: "right" },

  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fff", paddingHorizontal: 4 },
  td: { fontSize: 8, color: DARK, paddingHorizontal: 4 },
  tdMuted: { fontSize: 8, color: GRAY, paddingHorizontal: 4 },

  summaryGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  summaryLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  summaryValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },

  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginRight: 24 },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND, width: 80, textAlign: "right" },

  footer: { position: "absolute", bottom: 24, left: 36, right: 36, borderTop: `0.5pt solid ${LIGHT}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },

  badge: { backgroundColor: BRAND, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 7, color: "#fff", fontFamily: "Helvetica-Bold" },
  amber: { backgroundColor: "#FEF3C7" },
  amberText: { color: "#92400E" },
});

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

interface Props {
  result: FenceEstimateResult;
  projectName: string;
  orgName?: string;
  date?: string;
}

export function AdvancedEstimatePdf({ result, projectName, orgName, date }: Props) {
  const { bom, laborDrivers, totalMaterialCost, totalLaborCost, totalLaborHrs, totalCost, graph, deterministicScrap_in, probabilisticWastePct } = result;
  const totalLF = graph.edges.filter(e => e.type === "segment").reduce((s, e) => s + e.length_in / 12, 0);
  const postCount = graph.nodes.length;
  const gateCount = graph.edges.filter(e => e.type === "gate").length;
  const runCount = graph.edges.filter(e => e.type === "segment").length;
  const dateStr = date ?? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FenceEstimatePro</Text>
            <Text style={styles.subBrand}>Advanced Estimate — Run-Based Engine</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Organization</Text>
            <Text style={styles.headerValue}>{orgName ?? "—"}</Text>
            <Text style={[styles.headerLabel, { marginTop: 4 }]}>Date</Text>
            <Text style={styles.headerValue}>{dateStr}</Text>
          </View>
        </View>

        {/* Project name + badge */}
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{projectName}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>ADVANCED ENGINE</Text></View>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Linear Feet</Text>
            <Text style={styles.summaryValue}>{totalLF.toFixed(0)} LF</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Posts</Text>
            <Text style={styles.summaryValue}>{postCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Runs / Gates</Text>
            <Text style={styles.summaryValue}>{runCount} / {gateCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Waste (det. + prob.)</Text>
            <Text style={styles.summaryValue}>{(deterministicScrap_in / 12).toFixed(1)} LF + {Math.round(probabilisticWastePct * 100)}%</Text>
          </View>
        </View>

        {/* BOM Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill of Materials</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNarrow]}>SKU</Text>
            <Text style={[styles.th, styles.colWide]}>Material</Text>
            <Text style={[styles.th, { flex: 1 }]}>Category</Text>
            <Text style={[styles.th, styles.colNum]}>Qty</Text>
            <Text style={[styles.th, styles.colNum]}>Unit</Text>
            <Text style={[styles.th, styles.colNarrow]}>Conf.</Text>
          </View>
          {bom.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
              <Text style={[styles.td, styles.colNarrow, { fontSize: 7 }]}>{item.sku}</Text>
              <Text style={[styles.td, styles.colWide]}>{item.name}</Text>
              <Text style={[styles.tdMuted, { flex: 1 }]}>{item.category}</Text>
              <Text style={[styles.td, styles.colNum, { fontFamily: "Helvetica-Bold" }]}>{item.qty}</Text>
              <Text style={[styles.tdMuted, styles.colNum]}>{item.unit}</Text>
              <Text style={[styles.td, styles.colNarrow, { color: item.confidence >= 0.9 ? BRAND : "#D97706" }]}>
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Labor Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labor Drivers</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colWide]}>Activity</Text>
            <Text style={[styles.th, styles.colNum]}>Count</Text>
            <Text style={[styles.th, styles.colNum]}>Rate (hrs)</Text>
            <Text style={[styles.th, styles.colNum]}>Total hrs</Text>
          </View>
          {laborDrivers.filter(l => l.count > 0).map((l, i) => (
            <View key={i} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
              <Text style={[styles.td, styles.colWide]}>{l.activity}</Text>
              <Text style={[styles.td, styles.colNum]}>{l.count}</Text>
              <Text style={[styles.tdMuted, styles.colNum]}>{l.rateHrs}</Text>
              <Text style={[styles.td, styles.colNum, { fontFamily: "Helvetica-Bold" }]}>{l.totalHrs.toFixed(1)}</Text>
            </View>
          ))}
          <View style={[styles.row, { backgroundColor: LIGHT }]}>
            <Text style={[styles.td, styles.colWide, { fontFamily: "Helvetica-Bold" }]}>Total Labor</Text>
            <Text style={[styles.td, styles.colNum]} />
            <Text style={[styles.td, styles.colNum]} />
            <Text style={[styles.td, styles.colNum, { fontFamily: "Helvetica-Bold", color: BRAND }]}>{totalLaborHrs}h</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Summary</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Materials</Text>
            <Text style={styles.totalValue}>{fmt(totalMaterialCost)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Labor ({totalLaborHrs}h)</Text>
            <Text style={styles.totalValue}>{fmt(totalLaborCost)}</Text>
          </View>
          <View style={[styles.totalRow, { borderTop: `1pt solid ${BRAND}`, marginTop: 4, paddingTop: 4 }]}>
            <Text style={[styles.totalLabel, { fontSize: 12 }]}>Total Estimate</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>{fmt(totalCost)}</Text>
          </View>
        </View>

        {/* Audit trail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audit Trail</Text>
          {result.auditTrail.map((line, i) => (
            <Text key={i} style={[styles.tdMuted, { fontFamily: "Courier", fontSize: 7, marginBottom: 2 }]}>{line}</Text>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>FenceEstimatePro · Advanced Run-Based Engine · fenceestimatepro.com</Text>
          <Text style={styles.footerText}>Generated {dateStr} · Confidence: {Math.round(result.overallConfidence * 100)}%</Text>
        </View>
      </Page>
    </Document>
  );
}
