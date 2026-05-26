import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLoggedIn = await isAdminAuthenticated();

  if (!isLoggedIn) {
    redirect("/admin/login");
  }

  return children;
}
