export interface CompanyProfile {
  id: string;
  name: string;
  logo: string;
  type: string;
  description: string;
  style: string;
  focus: string;
}

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: "google",
    name: "Google",
    logo: "G",
    type: "Product & scale",
    description: "Structured thinking, technical depth, and scalable systems.",
    style: "Analytical and probing",
    focus: "Algorithms, system design, and problem solving",
  },
  {
    id: "amazon",
    name: "Amazon",
    logo: "A",
    type: "Product & scale",
    description: "Customer obsession, ownership, and measurable decisions.",
    style: "Bar-raiser behavioral + technical",
    focus: "Leadership principles, data structures, and design",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    logo: "M",
    type: "Product & scale",
    description: "Clear fundamentals, collaboration, and engineering judgment.",
    style: "Collaborative and scenario-based",
    focus: "Core CS, architecture, and communication",
  },
  {
    id: "tcs",
    name: "TCS",
    logo: "T",
    type: "Services & delivery",
    description: "Reliable fundamentals, practical delivery, and adaptability.",
    style: "Structured and practical",
    focus: "Programming fundamentals, databases, and projects",
  },
  {
    id: "infosys",
    name: "Infosys",
    logo: "I",
    type: "Services & delivery",
    description: "Strong foundations, client thinking, and clear explanations.",
    style: "Professional and fundamentals-led",
    focus: "Technical basics, scenarios, and communication",
  },
  {
    id: "startup",
    name: "Startup",
    logo: "S",
    type: "Early-stage team",
    description: "Practical ownership, speed, and learning through real projects.",
    style: "Conversational and hands-on",
    focus: "Projects, trade-offs, and practical problem solving",
  },
];
