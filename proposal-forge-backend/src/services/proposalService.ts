import { Proposal } from "../models/Proposal";
import type { AuthUser } from "./authService";

export type ProposalDoc = {
  _id: string;
  title: string;
  userId: string;
  status: "draft" | "sent" | "accepted";
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardStats = {
  total: number;
  thisMonth: number;
  /** Count of proposals created in the requested period (week / month / 6month / year) */
  generatedInPeriod: number;
  successRate: string;
  pending: number;
  recent: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
};

export type StatsPeriod = "week" | "month" | "6month" | "year";

function getMatch(user: AuthUser) {
  return user.role === "admin" ? {} : { userId: user.id };
}

function getStartOfPeriod(period: StatsPeriod): Date {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "6month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export async function getStats(
  user: AuthUser,
  options?: { period?: StatsPeriod }
): Promise<DashboardStats> {
  const match = getMatch(user);
  const now = new Date();
  const period = options?.period ?? "month";
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPeriod = getStartOfPeriod(period);

  const [total, thisMonth, generatedInPeriod, allForRate, pending, recentDocs] = await Promise.all([
    Proposal.countDocuments(match),
    Proposal.countDocuments({ ...match, createdAt: { $gte: startOfMonth } }),
    Proposal.countDocuments({ ...match, createdAt: { $gte: startOfPeriod } }),
    Proposal.find(match).select("status").lean(),
    Proposal.countDocuments({ ...match, status: { $in: ["draft", "sent"] } }),
    Proposal.find(match).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const accepted = allForRate.filter((p: { status?: string }) => p.status === "accepted").length;
  const successRate = allForRate.length > 0
    ? `${Math.round((accepted / allForRate.length) * 100)}%`
    : "0%";

  const recent = recentDocs.map((p: { _id: unknown; title: string; status: string; createdAt: Date }) => ({
    id: String(p._id),
    title: p.title,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

  return { total, thisMonth, generatedInPeriod, successRate, pending, recent };
}

export type AnalyticsByStatus = { status: string; count: number };
export type AnalyticsTimePoint = { date: string; count: number };
export type AnalyticsResult = {
  total: number;
  byStatus: AnalyticsByStatus[];
  acceptanceRate: number;
  thisMonth: number;
  timeSeries: AnalyticsTimePoint[];
};

export async function getAnalytics(user: AuthUser): Promise<AnalyticsResult> {
  const match = getMatch(user);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLast30 = new Date(now);
  startOfLast30.setDate(startOfLast30.getDate() - 30);

  const [total, thisMonth, byStatusDocs, timeSeriesDocs] = await Promise.all([
    Proposal.countDocuments(match),
    Proposal.countDocuments({ ...match, createdAt: { $gte: startOfMonth } }),
    Proposal.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Proposal.aggregate<{ _id: string; count: number }>([
      { $match: { ...match, createdAt: { $gte: startOfLast30 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byStatus: AnalyticsByStatus[] = byStatusDocs.map((d) => ({
    status: d._id ?? "unknown",
    count: d.count,
  }));

  const acceptedCount = byStatus.find((b) => b.status === "accepted")?.count ?? 0;
  const acceptanceRate = total > 0 ? Math.round((acceptedCount / total) * 100) : 0;

  const timeSeries: AnalyticsTimePoint[] = timeSeriesDocs.map((d) => ({
    date: typeof d._id === "string" ? d._id : String(d._id),
    count: d.count,
  }));

  return { total, byStatus, acceptanceRate, thisMonth, timeSeries };
}

export async function findAll(user: AuthUser) {
  const match = getMatch(user);
  const list = await Proposal.find(match).sort({ createdAt: -1 }).lean();
  return list.map((p: { _id: unknown; title: string; status: string; userId: unknown; createdAt: Date; updatedAt: Date; clientName?: string }) => ({
    id: String(p._id),
    title: p.title,
    clientName: p.clientName ?? "",
    status: p.status,
    userId: String(p.userId),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export type ProposalListItem = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedProposals = {
  proposals: ProposalListItem[];
  total: number;
  page: number;
  pages: number;
};

export async function findAllPaginated(
  user: AuthUser,
  options: { search?: string; status?: string; page?: number; limit?: number }
): Promise<PaginatedProposals> {
  const match = getMatch(user);
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(1000, Math.max(1, options.limit ?? 10));
  const query: Record<string, unknown> = { ...match };

  if (options.search && options.search.trim()) {
    const search = options.search.trim();
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { title: regex },
      { clientName: regex },
    ];
  }
  if (options.status && ["draft", "sent", "accepted"].includes(options.status)) {
    query.status = options.status;
  }

  const [docs, total] = await Promise.all([
    Proposal.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Proposal.countDocuments(query),
  ]);

  const proposals = docs.map((p: { _id: unknown; title: string; status: string; createdAt: Date; updatedAt: Date; clientName?: string }) => ({
    id: String(p._id),
    title: p.title,
    clientName: p.clientName ?? "",
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return { proposals, total, page, pages: Math.ceil(total / limit) || 1 };
}

export async function duplicate(id: string, user: AuthUser): Promise<ProposalListItem | null> {
  const existing = await Proposal.findById(id);
  if (!existing) return null;
  const ownerId = existing.userId.toString();
  if (user.role !== "admin" && ownerId !== user.id) return null;
  const doc = await Proposal.create({
    title: `${existing.title} (Copy)`,
    clientName: (existing as { clientName?: string }).clientName ?? "",
    clientInput: (existing as { clientInput?: string }).clientInput ?? "",
    userId: user.id,
    status: "draft",
    content: existing.content,
  });
  return {
    id: String(doc._id),
    title: doc.title,
    clientName: (doc as { clientName?: string }).clientName ?? "",
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function findById(id: string, user: AuthUser): Promise<ProposalDoc | null> {
  const doc = await Proposal.findById(id).lean();
  if (!doc) return null;
  const d = doc as { userId: { toString: () => string } };
  const ownerId = d.userId?.toString?.() ?? String(d.userId);
  if (user.role !== "admin" && ownerId !== user.id) return null;
  return doc as unknown as ProposalDoc;
}

export async function create(
  data: {
    title: string;
    content?: Record<string, unknown>;
    clientName?: string;
    clientInput?: string;
  },
  user: AuthUser
) {
  const doc = await Proposal.create({
    title: data.title,
    userId: user.id,
    status: "draft",
    content: data.content,
    clientName: data.clientName ?? "",
    clientInput: data.clientInput ?? "",
  });
  return { id: doc._id.toString(), title: doc.title, status: doc.status, userId: user.id };
}

export async function update(
  id: string,
  data: Partial<{
    title: string;
    status: string;
    content: Record<string, unknown>;
    clientName: string;
  }>,
  user: AuthUser
) {
  const existing = await Proposal.findById(id);
  if (!existing) return null;
  const ownerId = existing.userId.toString();
  if (user.role !== "admin" && ownerId !== user.id) return null;
  if (data.title !== undefined) existing.title = data.title;
  if (data.status !== undefined && ["draft", "sent", "accepted"].includes(data.status)) {
    existing.status = data.status as "draft" | "sent" | "accepted";
  }
  if (data.content !== undefined) existing.content = data.content;
  if (data.clientName !== undefined) (existing as { clientName?: string }).clientName = data.clientName;
  await existing.save();
  return existing.toObject();
}

export async function remove(id: string, user: AuthUser): Promise<boolean> {
  const existing = await Proposal.findById(id);
  if (!existing) return false;
  const ownerId = existing.userId.toString();
  if (user.role !== "admin" && ownerId !== user.id) return false;
  await Proposal.findByIdAndDelete(id);
  return true;
}

const SHARE_EXPIRY_DAYS = 30;

export async function findByShareToken(token: string) {
  const doc = await Proposal.findOne({ shareToken: token }).lean();
  if (!doc) return null;
  const d = doc as { sharedAt?: Date };
  if (d.sharedAt) {
    const expiry = new Date(d.sharedAt);
    expiry.setDate(expiry.getDate() + SHARE_EXPIRY_DAYS);
    if (new Date() > expiry) return null;
  }
  return doc;
}

export async function incrementViews(shareToken: string): Promise<boolean> {
  const result = await Proposal.findOneAndUpdate(
    { shareToken },
    { $inc: { views: 1 } }
  );
  return !!result;
}

export async function shareProposal(
  user: AuthUser,
  options: {
    proposalId?: string;
    proposalData?: { title?: string; content?: Record<string, unknown> };
    recipientEmail?: string;
    message?: string;
    sendEmail?: boolean;
  }
): Promise<{ shareLink: string; success: boolean; proposalId: string } | null> {
  const { nanoid } = await import("nanoid");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  let proposal: { _id: unknown; title: string; userId: unknown; content?: unknown } | null = null;

  if (options.proposalId) {
    const existing = await Proposal.findById(options.proposalId);
    if (!existing) return null;
    const ownerId = existing.userId.toString();
    if (user.role !== "admin" && ownerId !== user.id) return null;
    if (options.proposalData?.content !== undefined) {
      existing.content = options.proposalData.content;
      await existing.save();
    }
    proposal = existing;
  } else if (options.proposalData) {
    const title = options.proposalData.title || "Proposal";
    const created = await Proposal.create({
      title,
      userId: user.id,
      status: "draft",
      content: options.proposalData.content,
    });
    proposal = created;
  }

  if (!proposal) return null;

  const existingDoc = await Proposal.findById(proposal._id);
  let token: string;
  if (existingDoc?.shareToken && existingDoc.sharedAt) {
    const expiry = new Date(existingDoc.sharedAt);
    expiry.setDate(expiry.getDate() + SHARE_EXPIRY_DAYS);
    if (new Date() <= expiry) {
      token = existingDoc.shareToken;
    } else {
      token = nanoid(12);
      await Proposal.findByIdAndUpdate(proposal._id, {
        shareToken: token,
        sharedAt: new Date(),
      });
    }
  } else {
    token = nanoid(12);
    await Proposal.findByIdAndUpdate(proposal._id, {
      shareToken: token,
      sharedAt: new Date(),
    });
  }

  const shareLink = `${frontendUrl}/view-shared/${token}`;

  if (options.sendEmail && options.recipientEmail) {
    const { sendShareEmail } = await import("./emailService");
    await sendShareEmail(
      options.recipientEmail,
      shareLink,
      options.message || "",
      proposal.title
    );
    await Proposal.findByIdAndUpdate(proposal._id, { status: "sent" });
  }

  return {
    shareLink,
    success: true,
    proposalId: String(proposal._id),
  };
}
