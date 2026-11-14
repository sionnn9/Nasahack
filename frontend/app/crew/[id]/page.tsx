import { DashboardPage } from "@/components/health/dashboard-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardPage key={id} crewId={id} />;
}
