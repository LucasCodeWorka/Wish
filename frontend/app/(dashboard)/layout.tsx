import { Sidebar } from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="appShell">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
}
