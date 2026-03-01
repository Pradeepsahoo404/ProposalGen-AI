"use client";

import { useState, useEffect, useCallback } from "react";
import { Share, Clipboard, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ShareProposalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId?: string | null;
  proposalData?: { title?: string; content?: Record<string, unknown> } | null;
  proposalTitle?: string;
  onShareSuccess?: () => void;
};

export function ShareProposalDialog({
  open,
  onOpenChange,
  proposalId,
  proposalData,
  proposalTitle,
  onShareSuccess,
}: ShareProposalDialogProps) {
  const [shareLink, setShareLink] = useState<string>("");
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<"email" | "link">("link");

  const title = proposalTitle || proposalData?.title || "Proposal";

  const fetchOrCreateShareLink = useCallback(async () => {
    if (shareLink) return shareLink;
    setLinkLoading(true);
    try {
      const payload: {
        proposalId?: string;
        proposalData?: { title?: string; content?: Record<string, unknown> };
        sendEmail?: boolean;
      } = { sendEmail: false };
      if (proposalId) payload.proposalId = proposalId;
      else if (proposalData) payload.proposalData = { title: proposalData.title, content: proposalData.content };

      const { data } = await api.post<{ shareLink: string; proposalId?: string }>("/api/proposals/share", payload);
      setShareLink(data.shareLink);
      if (data.proposalId) setSavedProposalId(data.proposalId);
      return data.shareLink;
    } catch (err) {
      toast.error("Failed to generate link – try again");
      return "";
    } finally {
      setLinkLoading(false);
    }
  }, [proposalId, proposalData, shareLink]);

  useEffect(() => {
    if (open && !shareLink && (proposalId || proposalData)) {
      fetchOrCreateShareLink();
    }
    if (!open) {
      setRecipientEmail("");
      setMessage("");
    }
  }, [open, proposalId, proposalData, shareLink, fetchOrCreateShareLink]);

  const handleCopyLink = async () => {
    const link = shareLink || (await fetchOrCreateShareLink());
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSendEmail = async () => {
    const email = recipientEmail.trim();
    if (!email) {
      toast.error("Enter recipient email");
      return;
    }
    setEmailLoading(true);
    try {
      const payload: {
        proposalId?: string;
        proposalData?: { title?: string; content?: Record<string, unknown> };
        recipientEmail: string;
        message: string;
        sendEmail: boolean;
      } = { recipientEmail: email, message: message.trim(), sendEmail: true };
      if (savedProposalId || proposalId) payload.proposalId = savedProposalId || proposalId || undefined;
      else if (proposalData) payload.proposalData = { title: proposalData.title, content: proposalData.content };

      await api.post("/api/proposals/share", payload);
      toast.success("Proposal shared successfully!");
      onShareSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to share – try again");
    } finally {
      setEmailLoading(false);
    }
  };

  const hasContent = proposalId || proposalData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className={cn(
          "max-w-lg w-[95vw] sm:w-full max-h-[95vh] overflow-y-auto rounded-xl shadow-md",
          "flex flex-col gap-4 p-6"
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Share Proposal</DialogTitle>
          <DialogDescription>Send via email or copy secure link</DialogDescription>
        </DialogHeader>

        {title && (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
            <span className="font-medium text-foreground">{title}</span>
            {title !== "Proposal" && " — ready to share"}
          </p>
        )}

        <div className="flex rounded-lg border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setActiveSection("link")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
              activeSection === "link"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Clipboard className="h-4 w-4" />
            Copy Secure Link
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("email")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
              activeSection === "email"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Mail className="h-4 w-4" />
            Send via Email
          </button>
        </div>

        {activeSection === "link" && (
          <div className="space-y-3">
            <Label className="text-sm">Secure link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareLink || (linkLoading ? "Generating…" : "")}
                className="flex-1 font-mono text-sm bg-muted/50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-muted/50 transition-colors"
                onClick={handleCopyLink}
                disabled={linkLoading}
              >
                {linkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {activeSection === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Recipient email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="rounded-xl focus-visible:ring-[#3b82f6]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-message">Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a short message for the recipient…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="rounded-xl resize-none focus-visible:ring-[#3b82f6]"
              />
            </div>
            <Button
              type="button"
              className="w-full gap-2 bg-[#3b82f6] hover:bg-[#2563eb] shadow-md rounded-xl"
              onClick={handleSendEmail}
              disabled={emailLoading || !hasContent}
            >
              {emailLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send proposal
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground order-2 sm:order-1">
            This link is private and expires in 30 days.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
