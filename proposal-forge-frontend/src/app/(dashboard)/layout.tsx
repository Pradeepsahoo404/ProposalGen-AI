"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { PageBackButton } from "@/components/PageBackButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      {pathname !== "/" && pathname !== "/proposals/new" && pathname !== "/settings" && pathname !== "/change-password" && !/^\/proposals\/[^/]+$/.test(pathname ?? "") && (
        <div className="container mx-auto max-w-7xl px-4 pt-6 md:px-6">
          <PageBackButton />
        </div>
      )}
      {children}
    </main>
  );
}
