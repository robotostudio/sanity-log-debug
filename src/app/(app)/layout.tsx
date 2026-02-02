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
            <main className="flex-1 overflow-auto rounded-[8px] bg-[var(--content-bg)]">
              <div className="flex min-h-full flex-col px-[23px] pt-[19px] pb-[23px]">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </UploadProvider>
    </NuqsAdapter>
  );
}
