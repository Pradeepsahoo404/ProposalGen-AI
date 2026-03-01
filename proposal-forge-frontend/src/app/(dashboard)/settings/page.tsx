"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Upload, Loader2, ImageIcon, X, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LOGO_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const MAX_LOGO_MB = 2;

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  termsTemplate: z.string().max(10000).optional(),
  logoUrl: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  marginPercent: z.coerce.number().min(0).max(100).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const defaultValues: SettingsFormData = {
  companyName: "Your Company",
  termsTemplate: "",
  logoUrl: "",
  hourlyRate: 150,
  marginPercent: 20,
  taxRate: 0,
};

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<{
        user: {
          settings?: {
            logoUrl?: string;
            companyName?: string;
            termsTemplate?: string;
            pricingDefaults?: { hourlyRate?: number; marginPercent?: number; taxRate?: number };
          };
        };
      }>("/api/auth/me");
      return res.data;
    },
    enabled: !!user,
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
    values: data?.user?.settings != null
      ? {
          companyName: data.user.settings.companyName ?? defaultValues.companyName,
          termsTemplate: data.user.settings.termsTemplate ?? "",
          logoUrl: data.user.settings.logoUrl ?? "",
          hourlyRate: data.user.settings.pricingDefaults?.hourlyRate ?? defaultValues.hourlyRate,
          marginPercent: data.user.settings.pricingDefaults?.marginPercent ?? defaultValues.marginPercent,
          taxRate: data.user.settings.pricingDefaults?.taxRate ?? defaultValues.taxRate,
        }
      : undefined,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;
  const logoUrl = watch("logoUrl");

  const handleLogoFile = async (file: File) => {
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      toast.error(`Logo too large (max ${MAX_LOGO_MB}MB)`);
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ url: string }>("/api/upload/logo", formData);
      setValue("logoUrl", res.data.url, { shouldDirty: true });
      toast.success("Logo uploaded");
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : "Upload failed";
      toast.error(msg);
    } finally {
      setLogoUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleLogoFile(file);
    else toast.error("Use JPG, PNG, GIF, or WebP");
  };

  const onSave = async (values: SettingsFormData) => {
    try {
      await api.put("/api/auth/settings", {
        logoUrl: values.logoUrl || undefined,
        companyName: values.companyName,
        termsTemplate: values.termsTemplate || undefined,
        pricingDefaults: {
          hourlyRate: values.hourlyRate,
          marginPercent: values.marginPercent,
          taxRate: values.taxRate,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Settings saved!", { style: { borderLeft: "4px solid #22c55e" }, duration: 3000 });
    } catch {
      toast.error("Failed to save – check fields", { style: { borderLeft: "4px solid #ef4444" } });
    }
  };

  const applyDefaults = () => {
    form.reset(defaultValues);
    toast.info("Defaults applied – click Save to keep");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="mx-auto max-w-4xl w-full px-4 py-6 md:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <div className="mx-auto max-w-4xl w-full px-4 py-6 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2 shrink-0 rounded-xl"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <header>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Account Settings & Branding
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Customize how your proposals look</p>
          </header>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-6">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Logo & Company Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                <div className="shrink-0">
                  <div className="h-[200px] w-[200px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-muted/30 flex items-center justify-center">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    )}
                  </div>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-destructive hover:text-destructive"
                      onClick={() => setValue("logoUrl", "", { shouldDirty: true })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove logo
                    </Button>
                  )}
                </div>
                <div className="flex-1 w-full min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={LOGO_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoFile(f);
                      e.target.value = "";
                    }}
                  />
                  <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !logoUploading && fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed min-h-[120px] cursor-pointer transition-colors",
                      "border-muted-foreground/40 hover:border-primary hover:bg-primary/5",
                      logoUploading && "pointer-events-none opacity-70"
                    )}
                  >
                    {logoUploading ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Drop logo here or click to upload
                        </span>
                        <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP · max 2MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  placeholder="Your Company Name"
                  className={cn("rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary", errors.companyName && "border-destructive")}
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Label htmlFor="termsTemplate">Default terms template</Label>
              <Textarea
                id="termsTemplate"
                placeholder="Enter default terms, conditions, payment info..."
                className={cn("mt-2 min-h-[200px] rounded-xl resize-y border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary", errors.termsTemplate && "border-destructive")}
                {...register("termsTemplate")}
              />
              {errors.termsTemplate && (
                <p className="text-sm text-destructive mt-1">{errors.termsTemplate.message}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pricing defaults</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min={0}
                    step={10}
                    className={cn("rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary", errors.hourlyRate && "border-destructive")}
                    {...register("hourlyRate")}
                  />
                  {errors.hourlyRate && (
                    <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marginPercent">Default margin (%)</Label>
                  <Input
                    id="marginPercent"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className={cn("rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary", errors.marginPercent && "border-destructive")}
                    {...register("marginPercent")}
                  />
                  {errors.marginPercent && (
                    <p className="text-sm text-destructive">{errors.marginPercent.message}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="taxRate">Tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className={cn("rounded-xl max-w-xs border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary", errors.taxRate && "border-destructive")}
                    {...register("taxRate")}
                  />
                  {errors.taxRate && (
                    <p className="text-sm text-destructive">{errors.taxRate.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-t from-card to-card/95 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:justify-between sm:items-center">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary"
              onClick={applyDefaults}
            >
              Apply defaults
            </Button>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto gap-2 rounded-xl shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
