"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALLOWED = [".pdf", ".docx", ".txt"];
const MAX_MB = 20;

export type FileUploaderProps = {
  onSuccess?: (url: string, fileName: string) => void;
  onClear?: () => void;
  disabled?: boolean;
};

export function FileUploader({ onSuccess, onClear, disabled }: FileUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED.includes(ext)) {
      toast.error("Invalid file type. Use PDF, DOCX, or TXT.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large (max ${MAX_MB}MB).`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ url: string; fileName: string }>("/api/upload", formData);
      setUploadedUrl(res.data.url);
      setFileName(res.data.fileName);
      onSuccess?.(res.data.url, res.data.fileName);
      toast.success("File uploaded");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        && typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
        ? (err as { response: { data: { error: string } } }).response.data.error
        : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleClear = () => {
    setUploadedUrl(null);
    setFileName(null);
    onClear?.();
  };

  const isImage = uploadedUrl && /\.(jpg|jpeg|png|gif|webp)/i.test(fileName ?? "");

  if (uploadedUrl && fileName) {
    return (
      <div className="animate-in fade-in duration-300 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {isImage ? (
              <img src={uploadedUrl} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <FileText className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900 dark:text-slate-100">{fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-full">{uploadedUrl}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isUploading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#3b82f6]" />
        </div>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        className={cn(
          "flex h-72 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all",
          isDragOver
            ? "border-[#3b82f6] bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/40 hover:border-[#3b82f6] hover:scale-[1.02] hover:bg-slate-50 dark:hover:bg-slate-900/30",
          (disabled || isUploading) && "pointer-events-none opacity-70"
        )}
      >
        <Upload className="h-12 w-12 text-muted-foreground" />
        <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300">
          Drag & drop PDF, DOCX, TXT or click to browse
        </p>
        <p className="text-xs text-muted-foreground">Up to {MAX_MB}MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
