import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div className="min-h-screen bg-gray-50 p-6">{children}</div>;
}
