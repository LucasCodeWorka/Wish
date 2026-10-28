import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.WISHBI_STATIC_EXPORT === "true") {
    return (
      <main className="previewHome">
        <h1>Wish BI</h1>
        <p>Prévia de demonstração com dados fictícios.</p>
        <Link href="/vendas">Abrir o painel</Link>
      </main>
    );
  }
  redirect("/vendas");
}
