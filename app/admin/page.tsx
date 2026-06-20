import type { Metadata } from "next";

import AdminApp from "./AdminApp";

// Never index the admin surface.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Auth is enforced at the Cloudflare Access edge (and re-verified by the
// /api/admin routes). This page is just the client management UI.
export default function AdminPage() {
  return <AdminApp />;
}
