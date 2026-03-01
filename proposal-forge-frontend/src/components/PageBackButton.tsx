"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Renders a back button inside the page. Hidden on the main/home route (pathname === "/"). */
export function PageBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-4 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => router.back()}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
