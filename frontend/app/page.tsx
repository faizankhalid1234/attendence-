import type { Metadata } from "next";
import JsonLd from "@/app/components/JsonLd";
import HomePageBody from "@/app/components/home/HomePageBody";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Attendance Management Platform",
  description:
    "Attendance Mark helps teams track check-in and check-out with live GPS, camera proof, and role-based dashboards for members and company admins.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Attendance Management Platform",
    description:
      "Track shift attendance with live GPS and camera check-in/check-out. Separate dashboards for members and company admins.",
    url: "/",
  },
  twitter: {
    title: "Attendance Management Platform",
    description:
      "Track shift attendance with live GPS and camera check-in/check-out. Separate dashboards for members and company admins.",
  },
};

export default function Home() {
  const base = siteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Attendance Mark",
        url: `${base}/`,
        description:
          "Shift-based attendance with live GPS and camera check-in/out for company admins and members.",
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        name: "Attendance Mark",
        url: `${base}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        description:
          "Company admin and member portals with team dashboards and scoped attendance data.",
      },
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <HomePageBody />
    </>
  );
}
