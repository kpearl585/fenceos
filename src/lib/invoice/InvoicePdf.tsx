import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  orgName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  orgContact: {
    fontSize: 9,
    color: "#555",
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
    textAlign: "right",
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#555",
    textAlign: "right",
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 16,
  },
  billSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  billBox: {
    width: "48%",
  },
  billLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  billName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  billDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  rowText: { fontSize: 10, color: "#1a1a1a" },
  rowSubtext: { fontSize: 8, color: "#9ca3af", marginTop: 1 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: "#555",
  },
  totalsValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#2D6A4F",
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  notesBox: {
    marginTop: 24,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#555",
    lineHeight: 1.4,
  },
});

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function safeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  org: {
    name: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  job: {
    title: string;
    fenceType: string;
    linearFeet: number;
    gateCount: number;
    scheduledDate?: string;
  };
  estimateTotal: number;
  changeOrders: {
    id: string;
    description: string;
    subtotal: number;
    lines: {
      name: string;
      qty: number;
      unit_price: number;
      extended_price: number;
    }[];
  }[];
  notes?: string;
}

export default function InvoicePdf({ data }: { data: InvoiceData }) {
  const grandTotal =
    data.estimateTotal +
    data.changeOrders.reduce((s, co) => s + co.subtotal, 0);
  const orgName = safeText(data.org.name);
  const orgAddress = safeText(data.org.address);
  const orgPhone = safeText(data.org.phone);
  const orgEmail = safeText(data.org.email);
  const orgLogoUrl = safeText(data.org.logoUrl);
  const customerName = safeText(data.customer.name);
  const customerAddress = safeText(data.customer.address);
  const customerCityStateZip = [data.customer.city, data.customer.state, data.customer.zip]
    .map(safeText)
    .filter(Boolean)
    .join(", ");
  const customerEmail = safeText(data.customer.email);
  const customerPhone = safeText(data.customer.phone);
  const jobTitle = safeText(data.job.title);
  const fenceTypeLabel = safeText(data.job.fenceType)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const notes = safeText(data.notes);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {orgLogoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={orgLogoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.orgName}>{orgName}</Text>
            )}
            {orgLogoUrl && (
              <Text style={[styles.orgName, { marginTop: 6 }]}>
                {orgName}
              </Text>
            )}
            {orgAddress && (
              <Text style={styles.orgContact}>{orgAddress}</Text>
            )}
            {orgPhone && (
              <Text style={styles.orgContact}>{orgPhone}</Text>
            )}
            {orgEmail && (
              <Text style={styles.orgContact}>{orgEmail}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>
              Invoice #: {data.invoiceNumber}
            </Text>
            <Text style={styles.invoiceMeta}>Date: {data.invoiceDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To / Job Info */}
        <View style={styles.billSection}>
          <View style={styles.billBox}>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billName}>{customerName}</Text>
            {customerAddress && (
              <Text style={styles.billDetail}>{customerAddress}</Text>
            )}
            {customerCityStateZip && (
              <Text style={styles.billDetail}>
                {customerCityStateZip}
              </Text>
            )}
            {customerEmail && (
              <Text style={styles.billDetail}>{customerEmail}</Text>
            )}
            {customerPhone && (
              <Text style={styles.billDetail}>{customerPhone}</Text>
            )}
          </View>
          <View style={styles.billBox}>
            <Text style={styles.billLabel}>Job Details</Text>
            <Text style={styles.billName}>{jobTitle}</Text>
            <Text style={styles.billDetail}>
              {fenceTypeLabel}
              {" — "}
              {data.job.linearFeet} linear ft
              {data.job.gateCount > 0 ? `, ${data.job.gateCount} gate${data.job.gateCount > 1 ? "s" : ""}` : ""}
            </Text>
            {data.job.scheduledDate && (
              <Text style={styles.billDetail}>
                Scheduled: {data.job.scheduledDate}
              </Text>
            )}
          </View>
        </View>

        {/* Line Items — Original Scope */}
        <View>
          <Text style={styles.sectionLabel}>Original Scope</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              Amount
            </Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.rowText}>{jobTitle}</Text>
              <Text style={styles.rowSubtext}>
                {fenceTypeLabel}
                {" · "}{data.job.linearFeet} LF
                {data.job.gateCount > 0 ? ` · ${data.job.gateCount} gate${data.job.gateCount > 1 ? "s" : ""}` : ""}
              </Text>
            </View>
            <Text style={[styles.rowText, styles.colTotal]}>
              {fmt(data.estimateTotal)}
            </Text>
          </View>

          {/* Change Orders */}
          {data.changeOrders.map((co, i) => (
            <View key={co.id}>
              <Text style={styles.sectionLabel}>
                Change Order {i + 1}
                {co.description ? ` — ${safeText(co.description)}` : ""}
              </Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDesc]}>
                  Item
                </Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>
                  Qty
                </Text>
                <Text style={[styles.tableHeaderText, styles.colPrice]}>
                  Unit Price
                </Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>
                  Total
                </Text>
              </View>
              {co.lines.map((line, li) => (
                <View key={li} style={styles.tableRow}>
                  <Text style={[styles.rowText, styles.colDesc]}>
                    {safeText(line.name)}
                  </Text>
                  <Text style={[styles.rowText, styles.colQty]}>
                    {line.qty}
                  </Text>
                  <Text style={[styles.rowText, styles.colPrice]}>
                    {fmt(line.unit_price)}
                  </Text>
                  <Text style={[styles.rowText, styles.colTotal]}>
                    {fmt(line.extended_price)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Original Scope</Text>
              <Text style={styles.totalsValue}>
                {fmt(data.estimateTotal)}
              </Text>
            </View>
            {data.changeOrders.map((co, i) => (
              <View key={co.id} style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Change Order {i + 1}</Text>
                <Text style={styles.totalsValue}>{fmt(co.subtotal)}</Text>
              </View>
            ))}
            <View style={styles.totalDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.grandTotalLabel}>Total Due</Text>
              <Text style={styles.grandTotalValue}>{fmt(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{orgName}</Text>
          <Text style={styles.footerText}>
            Invoice #{data.invoiceNumber} · {data.invoiceDate}
          </Text>
          <Text style={styles.footerText}>Thank you for your business.</Text>
        </View>
      </Page>
    </Document>
  );
}
