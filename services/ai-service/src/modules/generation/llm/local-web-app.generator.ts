import {
  AI_PROJECT_CONTRACT_VERSION,
  ensureDefaultEnvironmentVariables,
  SUPPORTED_FRAMEWORK,
} from "../ai-project-manifest";
import { sanitizeGeneratedFiles } from "../package-sanitize";
import type { GeneratedScreen, LlmWebAppPayload } from "../generation.types";

type PageSpec = {
  name: string;
  routePath: string;
  slug: string;
  title: string;
  subtitle: string;
};

function wantsSupabaseStack(prompt: string): boolean {
  return /\b(supabase|e-?commerce|auth|login|sign[\s-]?up|database)\b/i.test(prompt);
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "My App";
  }
  const words = trimmed.split(/\s+/).slice(0, 5).join(" ");
  const cleaned = words.replace(/^(create|build|make|design)\s+(a|an)?\s*/i, "");
  const base = cleaned.trim() || words;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function toSlug(name: string): string {
  const cleaned = name.replace(/page$/i, "").trim();
  return cleaned
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function toRoutePath(name: string, index: number): string {
  if (index === 0) {
    return "/";
  }
  const slug = name
    .replace(/page$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/${slug || "page"}`;
}

function splitPageNameList(text: string): string[] {
  return text
    .split(/\s*,\s*|\s+and\s+|\s*&\s*|\s*\/\s*|\s*\|\s*/i)
    .map((part) => part.trim().replace(/^[-•]\s*/, ""))
    .filter((part) => part.length > 0 && part.length < 48)
    .map((part) => part.replace(/\bpage(s)?\b/gi, "").trim())
    .filter(Boolean);
}

/** Pull explicit page names from the user's prompt when they list them. */
function parseExplicitPages(prompt: string): string[] | null {
  const patterns = [
    /\bpages?\s*[:;\-]\s*([^.!\n]+)/i,
    /\bwith\s+(.+?)\s+pages?\b/i,
    /\binclude\s+(.+?)(?:\.|$)/i,
    /\b(\d+)\s*[-–]?\s*pages?\s*[:(\-]?\s*([^.!\n]+)/i,
    /\broutes?\s*[:;\-]\s*([^.!\n]+)/i,
    /\bscreens?\s*[:;\-]\s*([^.!\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match) {
      continue;
    }
    const raw = match[2] ?? match[1];
    const names = splitPageNameList(raw);
    if (names.length >= 2 && names.length <= 8) {
      return names;
    }
  }

  return null;
}

function specsFromNames(names: string[], prompt: string): PageSpec[] {
  const summary = prompt.trim().slice(0, 120);
  return names.map((name, index) => {
    const slug = toSlug(name) || `Page${index + 1}`;
    const display = name.replace(/page$/i, "").trim() || slug;
    return {
      name: display,
      routePath: toRoutePath(display, index),
      slug,
      title: display,
      subtitle: index === 0 ? summary || `Welcome to ${display}` : `Explore ${display}`,
    };
  });
}

function pagesFromPrompt(prompt: string): PageSpec[] {
  const explicit = parseExplicitPages(prompt);
  if (explicit) {
    return specsFromNames(explicit, prompt);
  }

  const lower = prompt.toLowerCase();

  /** First match wins — most specific categories first. */
  const categories: Array<{ patterns: RegExp; pages: string[] }> = [
  // AI-Powered Tool / Chatbot
    {
      patterns:
        /\b(chatbot|copilot|ai[- ]?powered|llm|gpt|generative ai|conversational ai)\b|(?:ai|ml)\s+(?:tool|assistant|app)\b|\b(prompt|chat)\s+(?:studio|interface|ui)\b/,
      pages: ["Home", "Chat", "Playground", "Settings"],
    },
    // CRM / Customer Management
    {
      patterns:
        /\b(crm|customer relationship|sales pipeline|lead management|deal pipeline)\b|\b(contacts?|accounts?|opportunities)\s+(?:crm|hub)\b/,
      pages: ["Dashboard", "Contacts", "Deals", "Reports"],
    },
    // LMS / EdTech / Course Platform
    {
      patterns:
        /\b(lms|edtech|e[- ]?learning|learning management|course platform|online academy)\b|\b(courses?|lessons?|modules?|enrollment)\s+(?:platform|portal)\b/,
      pages: ["Home", "Catalog", "My Learning", "Progress"],
    },
    // SaaS Dashboard + Billing
    {
      patterns:
        /\b(saas dashboard|subscription billing|billing dashboard|usage billing|mrr|arr)\b|(?:saas|subscription)\s+(?:dashboard|billing|metrics)|(?:dashboard|analytics)\s+(?:with\s+)?billing\b/,
      pages: ["Overview", "Analytics", "Billing", "Settings"],
    },
    // Internal Admin Panel / CRUD
    {
      patterns:
        /\b(admin panel|internal admin|back[- ]?office|crud|operations console|staff portal)\b|\b(manage|create|edit|delete)\s+(?:records?|entities|data)\b/,
      pages: ["Dashboard", "Records", "Create", "Settings"],
    },
    // E-Commerce Storefront (India)
    {
      patterns:
        /\b(india|indian|inr|rupee|rupees|upi|cod|cash on delivery|gst|storefront)\b.*\b(e[- ]?commerce|shop|store|marketplace)\b|\b(e[- ]?commerce|online store|storefront)\b.*\b(india|indian|upi|inr)\b|\bindian\s+(?:shop|store|marketplace)\b/,
      pages: ["Home", "Shop", "Cart", "Checkout"],
    },
    // E-Commerce (generic — after India-specific)
    {
      patterns: /\b(e[- ]?commerce|online store|storefront|marketplace|shop|cart|checkout)\b/,
      pages: ["Home", "Products", "Cart", "Checkout"],
    },
    // Booking / Scheduling App
    {
      patterns:
        /\b(booking|scheduling|appointment|reservation|calendar)\s+(?:app|system|platform|tool)?\b|\b(schedule|book)\s+(?:a\s+)?(?:slot|session|meeting|table)\b|\bavailability\b/,
      pages: ["Home", "Services", "Book", "My Bookings"],
    },
    // Blog / Newsletter / Content Hub
    {
      patterns:
        /\b(blog|newsletter|content hub|magazine|editorial|publishing platform)\b|\b(articles?|posts?|subscribers?)\s+(?:hub|site)\b/,
      pages: ["Home", "Articles", "About", "Subscribe"],
    },
    // Portfolio + Personal Brand
    {
      patterns:
        /\b(portfolio|personal brand|freelance|case studies)\b|\b(photographer|designer|creative|consultant)\s+(?:site|portfolio)\b/,
      pages: ["Home", "Work", "About", "Contact"],
    },
    // Landing Page + Startup Homepage
    {
      patterns:
        /\b(landing page|startup homepage|startup site|marketing site|promo page)\b|\b(startup|founder)\s+(?:landing|homepage|website)\b|\b(hero|waitlist|early access)\s+(?:page|site)\b/,
      pages: ["Home", "Features", "Pricing", "Sign up"],
    },
    // Landing / marketing (broader)
    {
      patterns: /\b(landing|marketing|promo|launch page)\b/,
      pages: ["Home", "Benefits", "Testimonials", "Contact"],
    },
    // SaaS / software product (marketing-style, not dashboard)
    {
      patterns: /\b(saas|b2b software|software product|product-led)\b/,
      pages: ["Home", "Features", "Pricing", "Sign up"],
    },
    // Dashboard / analytics (generic fallback)
    {
      patterns: /\b(dashboard|analytics|metrics|kpi)\b/,
      pages: ["Overview", "Analytics", "Reports", "Settings"],
    },
  ];

  for (const category of categories) {
    if (category.patterns.test(lower)) {
      return specsFromNames(category.pages, prompt);
    }
  }

  // Minimal default — only 2 pages unless prompt implies more
  if (/(single|one)\s*page/.test(lower)) {
    return specsFromNames(["Home"], prompt);
  }

  return specsFromNames(["Home", "About", "Features", "Contact"], prompt);
}

function escapeJsxText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageComponent(name: string, title: string, subtitle: string, promptHint: string): string {
  const safeTitle = escapeJsxText(title);
  const safeSubtitle = escapeJsxText(subtitle);
  const safeHint = escapeJsxText(promptHint);
  return `export function ${name}() {
  return (
    <section className="page">
      <p className="page-eyebrow">Generated for your prompt</p>
      <h1>${safeTitle}</h1>
      <p className="page-subtitle">${safeSubtitle}</p>
      <p className="page-prompt-hint">${safeHint}</p>
      <div className="card-grid">
        <article className="card" />
        <article className="card" />
        <article className="card" />
      </div>
    </section>
  );
}
`;
}

function pageCss(): string {
  return `.page-eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin: 0 0 0.5rem;
}

.page h1 {
  font-size: clamp(2rem, 4vw, 2.75rem);
  margin: 0 0 0.75rem;
}

.page-subtitle {
  color: var(--muted);
  margin: 0 0 1rem;
  max-width: 48ch;
}

.page-prompt-hint {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 2rem;
  max-width: 60ch;
  line-height: 1.5;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 8px 8px 0;
}

.card-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.card {
  min-height: 120px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-soft), var(--card));
  border: 1px solid var(--border);
}
`;
}

/** Free offline generator — no API key. Pages are derived from the user prompt. */
export function buildLocalWebAppPayload(prompt: string): LlmWebAppPayload {
  const projectName = titleFromPrompt(prompt);
  const pages = pagesFromPrompt(prompt);
  const promptHint = prompt.trim().slice(0, 200) || "Your app idea";

  const screens: GeneratedScreen[] = pages.map((page, index) => ({
    name: page.name,
    routePath: page.routePath,
    order: index + 1,
    description: page.subtitle,
  }));

  const imports = pages.map((p) => `import { ${p.slug} } from "./pages/${p.slug}";`).join("\n");
  const routes = pages
    .map((p) => `          <Route path="${p.routePath === "/" ? "/" : p.routePath}" element={<${p.slug} />} />`)
    .join("\n");

  const navLinks = pages
    .map((p) => `        <Link to="${p.routePath}">${p.name}</Link>`)
    .join("\n");

  const files: LlmWebAppPayload["files"] = [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "generated-app",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-router-dom": "^7.0.0" },
          devDependencies: {
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "@vitejs/plugin-react": "^4.3.0",
            typescript: "^5.7.0",
            vite: "^6.0.0",
          },
        },
        null,
        2,
      ),
    },
    {
      path: "index.html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    {
      path: "vite.config.ts",
      content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
    },
    {
      path: "tsconfig.json",
      content: `{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
`,
    },
    {
      path: "tsconfig.app.json",
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
`,
    },
    {
      path: "tsconfig.node.json",
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts"]
}
`,
    },
    {
      path: "src/main.tsx",
      content: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`,
    },
    {
      path: "src/index.css",
      content: `:root {
  --bg: #0a0a0f;
  --card: #181824;
  --border: rgba(255,255,255,0.1);
  --text: #f4f4f6;
  --muted: #9b9bab;
  --accent: #7c6cff;
  --accent-soft: rgba(124,108,255,0.15);
  font-family: system-ui, sans-serif;
  color: var(--text);
  background: var(--bg);
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; }
a { color: inherit; text-decoration: none; }
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
.logo { font-weight: 700; }
.nav { display: flex; gap: 1rem; font-size: 0.9375rem; color: var(--muted); flex-wrap: wrap; }
.nav a:hover { color: var(--text); }
.main { flex: 1; padding: 2rem 1.5rem; max-width: 960px; margin: 0 auto; width: 100%; }
`,
    },
    {
      path: "src/App.tsx",
      content: `import { Link, Route, Routes } from "react-router-dom";
${imports}

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">${projectName}</Link>
        <nav className="nav">
${navLinks}
        </nav>
      </header>
      <main className="main">
        <Routes>
${routes}
        </Routes>
      </main>
    </div>
  );
}
`,
    },
  ];

  for (const page of pages) {
    files.push({
      path: `src/pages/${page.slug}.tsx`,
      content: pageComponent(page.slug, page.title, page.subtitle, promptHint),
    });
    files.push({
      path: `src/pages/${page.slug}.css`,
      content: pageCss(),
    });
  }

  const dependencies = wantsSupabaseStack(prompt) ? ["@supabase/supabase-js", "react-router-dom"] : [];

  return {
    contractVersion: AI_PROJECT_CONTRACT_VERSION,
    suggestedProjectName: projectName,
    framework: SUPPORTED_FRAMEWORK,
    description: prompt.trim().slice(0, 240) || undefined,
    dependencies,
    devDependencies: [],
    environmentVariables: ensureDefaultEnvironmentVariables([], prompt),
    screens,
    files: sanitizeGeneratedFiles(files),
  };
}
