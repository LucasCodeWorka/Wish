import { Sidebar } from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="appShell">
      <Sidebar />
      <div className="content">
        {process.env.WISHBI_DEMO_MODE === "true" && (
          <div className="demoBanner" role="status">
            Prévia de demonstração · todos os números e nomes são fictícios
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
