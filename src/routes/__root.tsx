import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Genisys: AI Appointment Setting Portal" },
      { name: "description", content: "Internal portal for Genisys." },
      { property: "og:title", content: "Genisys: AI Appointment Setting Portal" },
      { name: "twitter:title", content: "Genisys: AI Appointment Setting Portal" },
      { property: "og:description", content: "Internal portal for Genisys." },
      { name: "twitter:description", content: "Internal portal for Genisys." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3cfe9ec1-75e3-41a4-b01b-a84b249ebb50/id-preview-95aea604--00a6a4eb-4c1c-45e2-aaa3-8df456efffe5.lovable.app-1776973235742.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3cfe9ec1-75e3-41a4-b01b-a84b249ebb50/id-preview-95aea604--00a6a4eb-4c1c-45e2-aaa3-8df456efffe5.lovable.app-1776973235742.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
      </div>
    </div>
  );
}
