/* eslint-disable @typescript-eslint/no-var-requires */
const pdfMake = require("pdfmake/build/pdfmake");
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).pdfMake = pdfMake;
}
const vfsFonts = require("pdfmake/build/vfs_fonts");
pdfMake.addVirtualFileSystem(vfsFonts);
pdfMake.addFonts({
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
});

export type ProposalDataForPdf = {
  client_summary?: string;
  extracted_modules?: Array<{ module_name: string; description: string }>;
  ai_enhanced_modules?: Array<{
    original_module_name: string;
    enhanced_name: string;
    improvements: string[];
    why_better: string;
    accepted?: boolean;
  }>;
  phased_roadmap?: Array<{ phase: string; description: string; duration_weeks: number }>;
  pricing_options?: Array<{
    option_name: string;
    total_price_usd: number;
    breakdown: Array<{ item: string; cost_usd: number }>;
    discount_percent?: number;
  }>;
  final_proposal_text?: string;
};

export type BrandingForPdf = {
  logoUrl?: string | null;
  companyName?: string | null;
  termsTemplate?: string | null;
};

function buildContent(data: ProposalDataForPdf, branding: BrandingForPdf): object[] {
  const content: object[] = [];
  const blue = "#3b82f6";
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  content.push({
    columns: [
      branding.companyName
        ? { text: branding.companyName, style: "companyName", width: "*" }
        : { text: "Proposal", style: "companyName", width: "*" },
      { text: dateStr, style: "date", alignment: "right" },
    ],
    margin: [0, 0, 0, 20],
  });
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }], margin: [0, 0, 0, 20] });

  const accepted = (data.ai_enhanced_modules ?? []).filter((m) => m.accepted !== false);
  const summary = data.client_summary?.trim() || "No summary provided.";
  content.push({ text: "Client Summary", style: "sectionHeader", margin: [0, 10, 0, 8] });
  content.push({ text: summary, style: "body", margin: [0, 0, 0, 16] });

  if (accepted.length > 0) {
    content.push({ text: "Proposed Modules", style: "sectionHeader", margin: [0, 10, 0, 8] });
    content.push({
      ul: accepted.map((m) => ({ text: `${m.enhanced_name} – ${m.why_better || ""}` })),
      style: "body",
      margin: [0, 0, 0, 16],
    });
  }

  const roadmap = data.phased_roadmap ?? [];
  if (roadmap.length > 0) {
    content.push({ text: "Phased Roadmap", style: "sectionHeader", margin: [0, 10, 0, 8] });
    content.push({
      table: {
        headerRows: 1,
        widths: ["*", "*", 60],
        body: [
          [
            { text: "Phase", style: "tableHeader", fillColor: "#f1f5f9" },
            { text: "Description", style: "tableHeader", fillColor: "#f1f5f9" },
            { text: "Weeks", style: "tableHeader", fillColor: "#f1f5f9" },
          ],
          ...roadmap.map((p) => [
            p.phase || "",
            p.description || "",
            String(p.duration_weeks ?? 0),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 16],
    });
  }

  const pricing = data.pricing_options ?? [];
  if (pricing.length > 0) {
    content.push({ text: "Pricing Options", style: "sectionHeader", margin: [0, 10, 0, 8] });
    for (const opt of pricing) {
      const discount = opt.discount_percent ?? 0;
      const sum = (opt.breakdown ?? []).reduce((a, b) => a + (b.cost_usd ?? 0), 0);
      const total = sum * (1 - discount / 100);
      content.push({
        text: opt.option_name,
        style: "subheader",
        margin: [0, 8, 0, 4],
      });
      content.push({
        table: {
          headerRows: 1,
          widths: ["*", 80],
          body: [
            [{ text: "Item", fillColor: "#f1f5f9" }, { text: "Cost (USD)", fillColor: "#f1f5f9" }],
            ...(opt.breakdown ?? []).map((b) => [b.item, `$${(b.cost_usd ?? 0).toLocaleString()}`]),
            [{ text: "Total", bold: true }, { text: `$${Math.round(total).toLocaleString()}`, bold: true }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
      });
    }
  }

  const fullText = data.final_proposal_text?.trim();
  if (fullText) {
    content.push({ text: "Proposal Details", style: "sectionHeader", margin: [0, 10, 0, 8] });
    content.push({ text: fullText.replace(/#{1,6}\s/g, "").replace(/\*\*/g, ""), style: "body", margin: [0, 0, 0, 16] });
  }

  if (branding.termsTemplate) {
    content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cbd5e1" }], margin: [0, 20, 0, 10] });
    content.push({ text: branding.termsTemplate, style: "footer", margin: [0, 0, 0, 0] });
  }

  return content;
}

export function generatePdf(
  proposalData: ProposalDataForPdf,
  branding: BrandingForPdf = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const content = buildContent(proposalData, branding);
      const docDefinition = {
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: "Roboto", fontSize: 10 },
        styles: {
          companyName: { fontSize: 18, bold: true },
          date: { fontSize: 10, color: "#64748b" },
          sectionHeader: { fontSize: 14, bold: true, color: "#3b82f6" },
          subheader: { fontSize: 12, bold: true },
          body: { fontSize: 10, lineHeight: 1.4 },
          tableHeader: { fontSize: 9, bold: true },
          footer: { fontSize: 8, color: "#64748b" },
        },
        content,
      };

      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => resolve(buffer), (err: Error) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
