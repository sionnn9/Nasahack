import { PathwayRunner } from "@/components/health/pathway-runner";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; pathwayId: string }>;
}) {
  const { id, pathwayId } = await params;
  return <PathwayRunner key={`${id}-${pathwayId}`} crewId={id} pathwayId={pathwayId} />;
}
