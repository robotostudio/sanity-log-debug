import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar";
import { UploadProvider } from "@/components/sources/upload-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NuqsAdapter>
      <UploadProvider>
        <SidebarProvider>
          <div className="flex h-screen bg-zinc-950">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1600px] px-6 py-6">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </UploadProvider>
    </NuqsAdapter>
  );
}
