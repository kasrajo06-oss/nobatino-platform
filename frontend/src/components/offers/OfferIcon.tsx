import { Body, Nutrition, PhysicalTherapy, Psychology, TestTubes, Tooth } from "healthicons-react/outline";
import { Sparkles } from "lucide-react";

const ICONS = { dentistry: Tooth, beauty: Sparkles, psychology: Psychology, checkup: TestTubes, physio: PhysicalTherapy, nutrition: Nutrition, other: Body };

export default function OfferIcon({ category, className = "size-8" }: { category: string; className?: string }) {
  const I = ICONS[category as keyof typeof ICONS] ?? Body;
  return <I className={className} aria-hidden />;
}
