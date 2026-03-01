import SiteNav from "@/components/SiteNav";
import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <div className="pt-16">
        {children}
      </div>
    </>
  );
}
