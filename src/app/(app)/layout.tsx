import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar";
import { UploadProvider } from "@/components/sources/upload-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <UploadProvider>
        <SidebarProvider>
          <div className="flex h-screen gap-2 bg-zinc-950 p-2">
            <Sidebar />
            <main className="flex-1 overflow-auto rounded-lg bg-[var(--content-bg)]">
              <div className="flex min-h-full flex-col px-6 pt-5 pb-6">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </UploadProvider>
    </NuqsAdapter>
  );
}
