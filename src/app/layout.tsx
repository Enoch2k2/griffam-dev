import type { Metadata } from "next";
import { site } from "@/config/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.owner}`,
    template: `%s | ${site.name}`,
  },
  description: `${site.owner}, ${site.title}. Web applications, custom tools, and AI-powered experiences.`,
  // Keep the unfinished scaffold out of search results until launch review.
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem("griffamdev-theme")}catch(e){}document.documentElement.dataset.theme=t==="light"||t==="cyberpunk"?t:window.matchMedia("(prefers-color-scheme: dark)").matches?"cyberpunk":"light"})()`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
