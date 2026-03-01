import { Request, Response } from "express";
import User from "../models/User";
import * as proposalService from "../services/proposalService";
import { generateProposal } from "../services/openaiService";
import { generateProposalWithGemini } from "../services/geminiService";
import { generateProposalWithPerplexity } from "../services/perplexityService";
import { config } from "../config";
import {
  generatePdf,
  type ProposalDataForPdf,
  type BrandingForPdf,
} from "../services/pdfService";

const VALID_STATS_PERIODS = ["week", "month", "6month", "year"] as const;

export async function getStats(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const period = typeof req.query.period === "string" && VALID_STATS_PERIODS.includes(req.query.period as "week" | "month" | "6month" | "year")
      ? (req.query.period as "week" | "month" | "6month" | "year")
      : "month";
    const stats = await proposalService.getStats(req.user, { period });
    return res.json(stats);
  } catch (err) {
    console.error("getStats", err);
    return res.status(500).json({ error: "Failed to load dashboard stats" });
  }
}

export async function getAnalytics(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const analytics = await proposalService.getAnalytics(req.user);
    return res.json(analytics);
  } catch (err) {
    console.error("getAnalytics", err);
    return res.status(500).json({ error: "Failed to load analytics" });
  }
}

export async function getProposals(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 10;
    const result = await proposalService.findAllPaginated(req.user, {
      search: search || undefined,
      status,
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
    });
    return res.json(result);
  } catch (err) {
    console.error("getProposals", err);
    return res.status(500).json({ error: "Failed to load proposals" });
  }
}

export async function duplicateProposal(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const duplicated = await proposalService.duplicate(req.params.id, req.user);
    if (!duplicated) return res.status(404).json({ error: "Proposal not found" });
    return res.status(201).json(duplicated);
  } catch (err) {
    console.error("duplicateProposal", err);
    return res.status(500).json({ error: "Failed to duplicate proposal" });
  }
}

export async function getProposalById(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const doc = await proposalService.findById(req.params.id, req.user);
    if (!doc) return res.status(404).json({ error: "Proposal not found" });
    return res.json(doc);
  } catch (err) {
    console.error("getProposalById", err);
    return res.status(500).json({ error: "Failed to load proposal" });
  }
}

export async function createProposal(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { title, content, clientName, clientInput } = req.body;
    const t = typeof title === "string" ? title.trim() : "";
    if (!t) {
      return res.status(400).json({ error: "Title is required" });
    }
    const created = await proposalService.create(
      {
        title: t,
        content: content && typeof content === "object" ? content : undefined,
        clientName: typeof clientName === "string" ? clientName : undefined,
        clientInput: typeof clientInput === "string" ? clientInput : undefined,
      },
      req.user
    );
    return res.status(201).json(created);
  } catch (err) {
    console.error("createProposal", err);
    return res.status(500).json({ error: "Failed to create proposal" });
  }
}

export async function updateProposal(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const updated = await proposalService.update(
      req.params.id,
      req.body,
      req.user
    );
    if (!updated) return res.status(404).json({ error: "Proposal not found" });
    return res.json(updated);
  } catch (err) {
    console.error("updateProposal", err);
    return res.status(500).json({ error: "Failed to update proposal" });
  }
}

export async function deleteProposal(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const deleted = await proposalService.remove(req.params.id, req.user);
    if (!deleted) return res.status(404).json({ error: "Proposal not found" });
    return res.status(204).send();
  } catch (err) {
    console.error("deleteProposal", err);
    return res.status(500).json({ error: "Failed to delete proposal" });
  }
}

export async function generateProposalHandler(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { clientInput } = req.body;
    if (!clientInput || typeof clientInput !== "string") {
      return res.status(400).json({ error: "clientInput (string) is required" });
    }

    const trimmed = clientInput.trim();
    if (!trimmed) {
      return res.status(400).json({ error: "clientInput cannot be empty" });
    }

    const hasOpenAI = !!config.openaiApiKey;
    const hasGemini = !!config.geminiApiKey;
    const hasPerplexity = !!config.perplexityApiKey;
    if (!hasOpenAI && !hasGemini && !hasPerplexity) {
      return res.status(503).json({
        error: "AI service not configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or PERPLEXITY_API_KEY in .env",
      });
    }

    let result: Awaited<ReturnType<typeof generateProposal>> | undefined;
    const tryPerplexity = async () => {
      if (!hasPerplexity) return;
      console.warn("Falling back to Perplexity");
      result = await generateProposalWithPerplexity(trimmed);
    };

    if (hasOpenAI) {
      try {
        result = await generateProposal(trimmed);
      } catch (openaiErr: unknown) {
        if (hasGemini) {
          try {
            console.warn("OpenAI failed, falling back to Gemini:", openaiErr);
            result = await generateProposalWithGemini(trimmed);
          } catch (geminiErr) {
            try {
              await tryPerplexity();
            } catch (perplexityErr) {
              console.error("Perplexity fallback failed:", perplexityErr);
              const msg = perplexityErr instanceof Error ? perplexityErr.message : "Generation failed";
              return res.status(500).json({ error: msg || "Generation failed (OpenAI, Gemini, Perplexity)" });
            }
          }
        } else {
          try {
            await tryPerplexity();
          } catch (perplexityErr) {
            console.error("Perplexity fallback failed:", perplexityErr);
            throw openaiErr;
          }
        }
      }
    } else if (hasGemini) {
      try {
        result = await generateProposalWithGemini(trimmed);
      } catch (geminiErr) {
        try {
          await tryPerplexity();
        } catch (perplexityErr) {
          console.error("Perplexity fallback failed:", perplexityErr);
          throw geminiErr;
        }
      }
    } else {
      result = await generateProposalWithPerplexity(trimmed);
    }

    if (result === undefined) {
      return res.status(500).json({ error: "Generation failed" });
    }

    return res.json(result);
  } catch (err: unknown) {
    console.error("generateProposal error:", err);

    const message = err instanceof Error ? err.message : "Generation failed";
    if (
      message.includes("rate") ||
      message.includes("limit") ||
      (err as { status?: number })?.status === 429
    ) {
      return res.status(429).json({ error: "Rate limit reached. Please try again later." });
    }
    if (message.includes("invalid") || message.includes("API key")) {
      return res.status(503).json({ error: "API key invalid or missing" });
    }

    return res.status(500).json({ error: message || "Generation failed" });
  }
}

export async function downloadProposalHandler(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { proposalData } = req.body;
    if (!proposalData || typeof proposalData !== "object") {
      return res.status(400).json({ error: "proposalData (object) is required" });
    }

    const userDoc = await User.findById(req.user.id).select("settings").lean();
    const settings = (userDoc as { settings?: { logoUrl?: string; companyName?: string; termsTemplate?: string } })?.settings ?? {};
    const branding: BrandingForPdf = {
      companyName: settings.companyName ?? null,
      logoUrl: settings.logoUrl ?? null,
      termsTemplate: settings.termsTemplate ?? null,
    };

    const pdfBuffer = await generatePdf(proposalData as ProposalDataForPdf, branding);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Proposal_${date}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    console.error("downloadProposal error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate PDF";
    return res.status(500).json({ error: message || "Failed to generate PDF – try again" });
  }
}

export async function shareProposalHandler(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { proposalId, proposalData, recipientEmail, message, sendEmail } = req.body;

    const result = await proposalService.shareProposal(req.user, {
      proposalId: typeof proposalId === "string" ? proposalId : undefined,
      proposalData:
        proposalData && typeof proposalData === "object"
          ? {
              title: typeof proposalData.title === "string" ? proposalData.title : undefined,
              content:
                proposalData.content && typeof proposalData.content === "object"
                  ? proposalData.content
                  : undefined,
            }
          : undefined,
      recipientEmail: typeof recipientEmail === "string" ? recipientEmail : undefined,
      message: typeof message === "string" ? message : undefined,
      sendEmail: !!sendEmail,
    });

    if (!result) return res.status(404).json({ error: "Proposal not found" });
    return res.json(result);
  } catch (err) {
    console.error("shareProposal error:", err);
    return res.status(500).json({ error: "Failed to share – try again" });
  }
}

export async function viewSharedHandler(req: Request, res: Response) {
  try {
    const token = req.params.token;
    if (!token) return res.status(404).json({ error: "Not found" });

    const doc = await proposalService.findByShareToken(token);
    if (!doc) return res.status(404).json({ error: "Link expired or not found" });

    await proposalService.incrementViews(token);

    const d = doc as {
      title: string;
      content?: unknown;
      views?: number;
      sharedAt?: Date;
    };
    return res.json({
      title: d.title,
      content: d.content,
      views: d.views ?? 0,
      sharedAt: d.sharedAt?.toISOString(),
    });
  } catch (err) {
    console.error("viewShared error:", err);
    return res.status(500).json({ error: "Failed to load proposal" });
  }
}
