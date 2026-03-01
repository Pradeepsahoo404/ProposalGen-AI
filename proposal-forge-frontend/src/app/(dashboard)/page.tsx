"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  BarChart3,
  FileText,
  Plus,
  TrendingUp,
  Clock,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Copy,
  Share,
  Search,
  RefreshCw,
  FileX,
  Download,
  Loader2,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type DashboardStats = {
  total: number;
  thisMonth: number;
  generatedInPeriod: number;
  successRate: string;
  pending: number;
  recent: Array<{ id: string; title: string; status: string; createdAt: string }>;
};

type GeneratedPeriod = "week" | "month" | "6month" | "year";

type ProposalListItem = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ProposalsResponse = {
  proposals: ProposalListItem[];
  total: number;
  page: number;
  pages: number;
};

type AnalyticsResponse = {
  total: number;
  byStatus: { status: string; count: number }[];
  acceptanceRate: number;
  thisMonth: number;
  timeSeries: { date: string; count: number }[];
};

const LIMIT = 10;
const PIE_COLORS = ["#22c55e", "#94a3b8", "#3b82f6"];

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "success" {
  if (status === "accepted") return "success";
  if (status === "sent") return "default";
  return "secondary";
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatedPeriod, setGeneratedPeriod] = useState<GeneratedPeriod>("month");

  const debouncedSearch = useDebounce(searchInput.trim(), 500);

  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats", generatedPeriod],
    queryFn: () =>
      api
        .get<DashboardStats>("/api/proposals/stats", { params: { period: generatedPeriod } })
        .then((res) => res.data),
    enabled: !!user,
  });

  const {
    data: proposalsData,
    isLoading: proposalsLoading,
    isFetching: proposalsFetching,
    error: proposalsError,
    refetch: refetchProposals,
  } = useQuery({
    queryKey: ["proposals", debouncedSearch, page, statusFilter],
    queryFn: () =>
      api
        .get<ProposalsResponse>("/api/proposals", {
          params: {
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            page,
            limit: LIMIT,
          },
        })
        .then((res) => res.data),
    enabled: !!user,
  });

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<AnalyticsResponse>("/api/proposals/analytics").then((res) => res.data),
    enabled: !!user,
  });

  if (proposalsError) {
    toast.error("Failed to load proposals");
  }

  const isAdmin = user?.role === "admin";
  const proposals = proposalsData?.proposals ?? [];
  const totalPages = proposalsData?.pages ?? 1;
  const total = proposalsData?.total ?? 0;

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const prevData = queryClient.getQueryData<ProposalsResponse>(["proposals", debouncedSearch, page, statusFilter]);
    try {
      queryClient.setQueryData<ProposalsResponse>(["proposals", debouncedSearch, page, statusFilter], (old) =>
        old ? { ...old, proposals: old.proposals.filter((p) => p.id !== deleteId), total: Math.max(0, old.total - 1) } : old
      );
      setDeleteId(null);
      await api.delete(`/api/proposals/${deleteId}`);
      toast.success("Proposal deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] }),
        queryClient.invalidateQueries({ queryKey: ["proposals"] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ["proposals"] });
    } catch {
      if (prevData) queryClient.setQueryData(["proposals", debouncedSearch, page, statusFilter], prevData);
      toast.error("Failed to delete – try again");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteId, debouncedSearch, page, statusFilter, queryClient]);

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await api.post<ProposalListItem>(`/api/proposals/${id}/duplicate`);
        toast.success("Proposal duplicated");
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      } catch {
        toast.error("Failed to duplicate – try again");
      }
    },
    [queryClient]
  );

  const handleMarkStatus = useCallback(
    async (id: string, status: "sent" | "accepted") => {
      try {
        await api.put(`/api/proposals/${id}`, { status });
        toast.success(status === "accepted" ? "Marked as Accepted" : "Marked as Sent");
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      } catch {
        toast.error("Failed to update status");
      }
    },
    [queryClient]
  );

  const columnHelper = createColumnHelper<ProposalListItem>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/proposals/${row.original.id}`}
            className="font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
          >
            {row.original.title}
          </Link>
        ),
      }),
      columnHelper.accessor("clientName", {
        header: "Client",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.clientName || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatRelative(row.original.createdAt)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-muted/50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-md">
              <DropdownMenuItem asChild>
                <Link href={`/proposals/${row.original.id}`} className="flex items-center gap-2 cursor-pointer">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/proposals/${row.original.id}`} className="flex items-center gap-2 cursor-pointer">
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(row.original.id)} className="cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {row.original.status !== "sent" && row.original.status !== "accepted" && (
                <DropdownMenuItem
                  onClick={() => handleMarkStatus(row.original.id, "sent")}
                  className="cursor-pointer"
                >
                  Mark as Sent
                </DropdownMenuItem>
              )}
              {row.original.status !== "accepted" && (
                <DropdownMenuItem
                  onClick={() => handleMarkStatus(row.original.id, "accepted")}
                  className="cursor-pointer text-green-600 dark:text-green-400 focus:text-green-600 dark:focus:text-green-400"
                >
                  Mark as Accepted
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/proposals/${row.original.id}`} className="flex items-center gap-2 cursor-pointer">
                  <Share className="h-4 w-4" />
                  Share
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteId(row.original.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ] as ColumnDef<ProposalListItem>[],
    [handleDuplicate, handleMarkStatus]
  );

  const table = useReactTable({
    data: proposals,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const generatedPeriodLabel: Record<GeneratedPeriod, string> = {
    week: "This week",
    month: "This month",
    "6month": "Last 6 months",
    year: "This year",
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-8 w-40 mb-4 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isAdmin ? "Admin Dashboard" : "Dashboard"}
            </h1>
            <p className="mt-1.5 text-muted-foreground font-medium">Welcome back, {user.email}</p>
          </div>
        </div>

        <Separator className="mb-8 bg-slate-200/80 dark:bg-slate-700/50" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Proposals
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {statsData?.total ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                Generated
              </CardTitle>
              <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                <Select
                  value={generatedPeriod}
                  onValueChange={(v) => setGeneratedPeriod(v as GeneratedPeriod)}
                  options={[
                    { value: "week", label: "This week" },
                    { value: "month", label: "This month" },
                    { value: "6month", label: "Last 6 months" },
                    { value: "year", label: "This year" },
                  ]}
                  size="sm"
                  wrapperClassName="w-auto min-w-[130px]"
                  aria-label="Time period for generated count"
                />
                <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsData?.generatedInPeriod ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {generatedPeriodLabel[generatedPeriod]}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" title="Accepted proposals ÷ total proposals">
                Success Rate
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {statsData?.successRate ?? "0%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted ÷ total proposals
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Pending
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {statsData?.pending ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Draft + sent (not yet accepted)
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
            <CardTitle className="text-2xl font-bold tracking-tight">Proposal History</CardTitle>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or client"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-primary"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "draft", label: "Draft" },
                    { value: "sent", label: "Sent" },
                    { value: "accepted", label: "Accepted" },
                  ]}
                  placeholder="All statuses"
                  wrapperClassName="w-auto min-w-[160px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl hover:bg-muted/50"
                  onClick={() => refetchProposals()}
                  disabled={proposalsFetching}
                >
                  <RefreshCw className={cn("h-4 w-4", proposalsFetching && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              <Button asChild size="sm" className="gap-2 rounded-xl shrink-0 shadow-md">
                <Link href="/proposals/new">
                  <Plus className="h-4 w-4" />
                  New Proposal
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-b-xl">
              {proposalsLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-full animate-pulse" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 animate-pulse" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full animate-pulse" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 animate-pulse" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded animate-pulse" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : !proposals.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                    <FileX className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">No proposals found</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                    {debouncedSearch || statusFilter
                      ? "Try adjusting your search or filters."
                      : "Create your first proposal to get started."}
                  </p>
                  <Button asChild className="mt-6 gap-2 rounded-xl shadow-md">
                    <Link href="/proposals/new">
                      <Plus className="h-4 w-4" />
                      Create New Proposal
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id} className="bg-muted/30">
                          {hg.headers.map((h) => (
                            <TableHead key={h.id} className="font-medium">
                              {flexRender(h.column.columnDef.header, h.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {total > 0 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 py-3 bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        Showing page {page} of {Math.max(1, totalPages)} ({total} total) · max {LIMIT} per page
                      </p>
                      <Pagination
                        page={page}
                        totalPages={Math.max(1, totalPages)}
                        onPageChange={setPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-10" />

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Analytics & Insights
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl hover:bg-muted/50"
                onClick={() => refetchAnalytics()}
                disabled={analyticsLoading}
              >
                <RefreshCw className={cn("h-4 w-4", analyticsLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={async () => {
                  try {
                    const { data } = await api.get<ProposalsResponse>("/api/proposals", {
                      params: { page: 1, limit: 1000, ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(statusFilter ? { status: statusFilter } : {}) },
                    });
                    const rows = data.proposals ?? [];
                    const headers = ["ID", "Title", "Client", "Status", "Created", "Updated"];
                    const csvRows = [
                      headers.join(","),
                      ...rows.map((p) =>
                        [
                          escapeCsvCell(p.id),
                          escapeCsvCell(p.title),
                          escapeCsvCell(p.clientName),
                          escapeCsvCell(p.status),
                          escapeCsvCell(p.createdAt),
                          escapeCsvCell(p.updatedAt),
                        ].join(",")
                      ),
                    ];
                    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `proposals-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("CSV exported");
                  } catch {
                    toast.error("Failed to export CSV");
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-80 rounded-xl animate-pulse" />
                <Skeleton className="h-80 rounded-xl animate-pulse" />
              </div>
              <Skeleton className="h-80 rounded-xl animate-pulse" />
            </div>
          ) : analyticsData && analyticsData.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                No analytics data yet
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Create your first proposal to see charts and insights here.
              </p>
              <Button asChild className="mt-6 gap-2 rounded-xl shadow-md">
                <Link href="/proposals/new">
                  <Plus className="h-4 w-4" />
                  Create Proposal
                </Link>
              </Button>
            </div>
          ) : analyticsData ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                  <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <CardTitle className="text-lg font-bold tracking-tight">By Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.byStatus} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)" }}
                            formatter={(value: number) => [value, "Count"]}
                          />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Proposals" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                  <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <CardTitle className="text-lg font-bold tracking-tight">Win / Other</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Accepted", value: analyticsData.byStatus.find((b) => b.status === "accepted")?.count ?? 0 },
                              { name: "Draft", value: analyticsData.byStatus.find((b) => b.status === "draft")?.count ?? 0 },
                              { name: "Sent", value: analyticsData.byStatus.find((b) => b.status === "sent")?.count ?? 0 },
                            ].filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {[
                              { name: "Accepted", value: analyticsData.byStatus.find((b) => b.status === "accepted")?.count ?? 0 },
                              { name: "Draft", value: analyticsData.byStatus.find((b) => b.status === "draft")?.count ?? 0 },
                              { name: "Sent", value: analyticsData.byStatus.find((b) => b.status === "sent")?.count ?? 0 },
                            ]
                              .filter((d) => d.value > 0)
                              .map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)" }}
                            formatter={(value: number) => [value, "Count"]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
                  <CardTitle className="text-lg font-bold tracking-tight">Proposals Over Time (last 30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {analyticsData.timeSeries.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.timeSeries} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)" }}
                            formatter={(value: number) => [value, "Created"]}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: "#3b82f6", r: 4 }}
                            name="Proposals"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        No activity in the last 30 days
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </section>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-xl shadow-lg max-w-md min-w-[min(24rem,95vw)] border-red-200 dark:border-red-900/50 p-6 bg-white dark:bg-slate-900">
          <DialogHeader className="px-0 pt-0 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <DialogTitle className="text-lg">Delete proposal?</DialogTitle>
                <DialogDescription className="text-left">
                  {deleteId ? (proposals.find((p) => p.id === deleteId)?.title ?? "This proposal") : "This proposal"} will be permanently removed. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-end pt-6 pb-0 px-0 sm:gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting} className="rounded-xl shrink-0">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 gap-2 shrink-0"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
