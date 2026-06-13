import type { Tone, Audience } from "@/lib/types";

export interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  slideCount: number;
  tone: Tone;
  audience: Audience;
  prompt: string;
  tags: string[];
}

export const DECK_TEMPLATES: DeckTemplate[] = [
  {
    id: "series-a-pitch",
    name: "Series A Pitch",
    description: "10-slide investor deck for a startup raising Series A.",
    slideCount: 10,
    tone: "sales",
    audience: "investor",
    tags: ["startup", "fundraising"],
    prompt:
      "A Series A pitch deck for an AI-powered logistics startup. Cover: the problem in last-mile delivery, our AI routing solution, product demo highlights, traction metrics (ARR, customers, growth rate), market size (TAM/SAM/SOM), business model and unit economics, competitive landscape, team bios, and the funding ask with use of funds.",
  },
  {
    id: "q3-review",
    name: "Quarterly Business Review",
    description: "Executive summary of quarterly performance with KPIs.",
    slideCount: 10,
    tone: "professional",
    audience: "executive",
    tags: ["finance", "quarterly"],
    prompt:
      "Q3 business review for the executive team. Include: title slide, agenda, revenue vs. target, regional performance breakdown, top 3 wins, key challenges, customer metrics (NPS, churn, new logos), pipeline outlook, and recommended actions for Q4.",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Announce a new product to customers and stakeholders.",
    slideCount: 8,
    tone: "sales",
    audience: "general",
    tags: ["marketing", "product"],
    prompt:
      "Product launch presentation for a new SaaS analytics dashboard. Cover: the customer pain point, product overview with key features, live demo walkthrough highlights, pricing tiers, customer testimonials, competitive differentiation, and a call-to-action with next steps.",
  },
  {
    id: "technical-deep-dive",
    name: "Technical Deep Dive",
    description: "Architecture and implementation details for engineers.",
    slideCount: 12,
    tone: "technical",
    audience: "technical",
    tags: ["engineering", "architecture"],
    prompt:
      "Technical deep dive on our event-driven microservices architecture. Cover: system overview diagram, service boundaries and responsibilities, data flow and event schemas, API design principles, scaling strategy, observability stack, security model, deployment pipeline, and open technical decisions.",
  },
  {
    id: "sales-deck",
    name: "Sales Pitch",
    description: "Persuade a prospect to buy your solution.",
    slideCount: 8,
    tone: "sales",
    audience: "executive",
    tags: ["sales", "b2b"],
    prompt:
      "B2B sales deck for an enterprise HR analytics platform. Cover: the hiring and retention challenge, our platform overview, ROI calculator highlights, 3 customer success stories with metrics, integration capabilities, pricing and packages, and next steps to start a pilot.",
  },
  {
    id: "lecture",
    name: "Lecture / Training",
    description: "Structured educational content with speaker notes.",
    slideCount: 15,
    tone: "academic",
    audience: "general",
    tags: ["education", "training"],
    prompt:
      "A 15-slide lecture on machine learning fundamentals for non-technical managers. Cover: what ML is and is not, supervised vs. unsupervised learning, common use cases in business, data requirements, model evaluation basics, ethical considerations, and how to evaluate ML vendor proposals.",
  },
  {
    id: "strategy-review",
    name: "Strategy Review",
    description: "Consulting-style strategic analysis and recommendations.",
    slideCount: 10,
    tone: "professional",
    audience: "executive",
    tags: ["consulting", "strategy"],
    prompt:
      "Strategic review for a retail company entering the D2C channel. Cover: market context and trends, current state assessment, strategic options (build vs. partner vs. acquire), recommended approach with rationale, 3-year roadmap, investment requirements, key risks and mitigations, and success metrics.",
  },
  {
    id: "project-status",
    name: "Project Status Update",
    description: "Weekly or monthly project progress for stakeholders.",
    slideCount: 6,
    tone: "professional",
    audience: "general",
    tags: ["project", "status"],
    prompt:
      "Monthly project status update for a CRM migration initiative. Include: project overview and timeline, accomplishments this month, current sprint progress (% complete), blockers and risks, budget vs. actual, decisions needed from leadership, and plan for next month.",
  },
  {
    id: "sustainability-report",
    name: "Sustainability Report",
    description: "ESG metrics and environmental impact for stakeholders.",
    slideCount: 10,
    tone: "professional",
    audience: "general",
    tags: ["ESG", "sustainability"],
    prompt:
      "Annual sustainability report for a manufacturing company. Cover: ESG commitment statement, carbon footprint and YoY reduction, energy mix and renewable targets, waste and recycling metrics, supply chain sustainability initiatives, employee wellbeing programs, community impact, and 2030 goals.",
  },
  {
    id: "board-meeting",
    name: "Board Meeting",
    description: "Concise board-level update with financials and decisions.",
    slideCount: 8,
    tone: "professional",
    audience: "executive",
    tags: ["board", "governance"],
    prompt:
      "Board meeting presentation for a SaaS company. Include: CEO opening and key messages, financial summary (revenue, EBITDA, cash), KPI dashboard, product roadmap update, people and org changes, competitive landscape update, items requiring board approval, and Q&A appendix topics.",
  },
];
