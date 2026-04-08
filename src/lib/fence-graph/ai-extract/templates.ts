// ── Quick Templates for Common Fence Jobs ────────────────────────────

export interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "standard-backyard-privacy",
    name: "Standard Backyard Privacy",
    description: "6ft vinyl privacy fence, typical residential",
    icon: "🏡",
    prompt: "180 feet of 6ft vinyl privacy fence around backyard. Sandy loam soil, mostly flat. One 12ft double drive gate. Standard residential installation.",
  },
  {
    id: "pool-enclosure",
    name: "Pool Enclosure",
    description: "4ft vinyl picket with pool code gate",
    icon: "🏊",
    prompt: "120 feet of 4ft vinyl picket fence for pool enclosure. One self-closing walk gate for pool code compliance. Sandy soil, flat terrain. Coastal/wind exposure considerations.",
  },
  {
    id: "front-yard-picket",
    name: "Front Yard Picket",
    description: "4ft decorative vinyl picket",
    icon: "🌳",
    prompt: "100 feet of 4ft white vinyl picket fence for front yard. Two 4ft walk gates. Sandy loam soil, flat. Decorative residential installation.",
  },
  {
    id: "commercial-chain-link",
    name: "Commercial Chain Link",
    description: "6ft chain link perimeter security",
    icon: "🏢",
    prompt: "400 feet of 6ft galvanized chain link fence for commercial property perimeter. Two 16ft double drive gates for vehicle access. Standard soil, level ground. Commercial installation.",
  },
];

export function getTemplateById(id: string): QuickTemplate | undefined {
  return QUICK_TEMPLATES.find(t => t.id === id);
}
