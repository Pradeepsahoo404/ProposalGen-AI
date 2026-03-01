import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "AI-powered Sales Proposal SaaS",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
