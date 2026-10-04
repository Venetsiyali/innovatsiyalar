import type { MetadataRoute } from "next";
import { t } from "@/lib/i18n";

// Lets students "install" the LMS on their phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${t("app.name")} — ${t("app.fullName")}`,
    short_name: t("app.name"),
    description: t("app.tagline"),
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#1e3a8a",
    lang: "uz",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
