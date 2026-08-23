const COMPANY_PROFILES = {
  google: {
    id: "google",
    name: "Google",
    type: "Product and scale",
    style: "Analytical and probing",
    categories: "algorithms, system design, and structured problem solving",
    difficulty: "Hard",
    technicalFocus: "data structures, algorithms, scalability, and technical trade-offs",
    criteria: "correctness, depth, structured reasoning, complexity awareness, and clarity",
    threshold: 75,
  },
  amazon: {
    id: "amazon",
    name: "Amazon",
    type: "Product and scale",
    style: "Bar-raiser behavioral and technical",
    categories: "leadership scenarios, coding fundamentals, and system design",
    difficulty: "Hard",
    technicalFocus: "data structures, distributed systems, metrics, and customer impact",
    criteria: "ownership, customer focus, measurable impact, technical accuracy, and clarity",
    threshold: 75,
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    type: "Product and scale",
    style: "Collaborative and scenario-based",
    categories: "core CS, architecture, collaboration, and applied scenarios",
    difficulty: "Medium",
    technicalFocus: "object-oriented design, APIs, databases, and architecture",
    criteria: "fundamentals, collaboration, sound judgment, technical accuracy, and communication",
    threshold: 70,
  },
  tcs: {
    id: "tcs",
    name: "TCS",
    type: "Services and delivery",
    style: "Structured and practical",
    categories: "programming fundamentals, databases, projects, and delivery scenarios",
    difficulty: "Medium",
    technicalFocus: "language fundamentals, SQL, debugging, and project application",
    criteria: "reliable fundamentals, practical application, adaptability, and clear explanation",
    threshold: 65,
  },
  infosys: {
    id: "infosys",
    name: "Infosys",
    type: "Services and delivery",
    style: "Professional and fundamentals-led",
    categories: "technical basics, project scenarios, and communication",
    difficulty: "Medium",
    technicalFocus: "programming, databases, software engineering, and client scenarios",
    criteria: "technical foundations, logical thinking, professionalism, and communication",
    threshold: 65,
  },
  startup: {
    id: "startup",
    name: "Startup",
    type: "Early-stage team",
    style: "Conversational and hands-on",
    categories: "projects, practical problem solving, product trade-offs, and ownership",
    difficulty: "Medium",
    technicalFocus: "shipping decisions, debugging, architecture trade-offs, and learning speed",
    criteria: "practical reasoning, ownership, prioritization, trade-offs, and communication",
    threshold: 65,
  },
};

const DEFAULT_PROFILE = COMPANY_PROFILES.microsoft;

const getCompanyProfile = (companyId) => COMPANY_PROFILES[companyId] || DEFAULT_PROFILE;

module.exports = { COMPANY_PROFILES, getCompanyProfile };
