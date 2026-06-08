import type { GeneratedFile } from "./generation.types";

/** Packages LLMs often invent; they break npm install and Vite preview. */
export const BLOCKED_NPM_PACKAGES = new Set([
  "@types/vite",
  "tsconfig-paths-plugin",
  "@supabase/supabase-js-auth",
  "css-loader",
  "style-loader",
  "webpack",
  "webpack-cli",
  "webpack-dev-server",
  "html-webpack-plugin",
  "babel-loader",
  "file-loader",
  "url-loader",
  "sass-loader",
  "less-loader",
  "postcss-loader",
  "mini-css-extract-plugin",
  "vite-plugin-react",
  "vite-plugin-react-refresh",
  "@types/react-router-dom",
]);

const CORE_DEPENDENCIES: Record<string, string> = {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.30.1",
};

const CORE_DEV_DEPENDENCIES: Record<string, string> = {
  vite: "^5.4.11",
  typescript: "^5.6.3",
  "@types/react": "^18.3.8",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.4",
};

function cleanDependencyMap(deps?: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(deps ?? {}).filter(([name]) => !BLOCKED_NPM_PACKAGES.has(name)),
  );
}

export function sanitizePackageJsonInFiles(files: GeneratedFile[]): GeneratedFile[] {
  const next = files.map((file) => ({ ...file }));
  const packageJson = next.find((file) => file.path === "package.json");
  if (!packageJson) {
    return next;
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      name?: string;
      private?: boolean;
      type?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencies = cleanDependencyMap(parsed.dependencies);
    const devDependencies = cleanDependencyMap(parsed.devDependencies);

    // Vite must not live in dependencies (LLMs often misplace it).
    const viteFromDeps = dependencies.vite;
    delete dependencies.vite;

    for (const [name, version] of Object.entries(CORE_DEPENDENCIES)) {
      dependencies[name] = dependencies[name] ?? version;
    }

    for (const [name, version] of Object.entries(CORE_DEV_DEPENDENCIES)) {
      devDependencies[name] = devDependencies[name] ?? viteFromDeps ?? version;
    }

    if (viteFromDeps && !devDependencies.vite) {
      devDependencies.vite = viteFromDeps.startsWith("^") ? viteFromDeps : `^${viteFromDeps}`;
    }

    const scripts = parsed.scripts ?? {};
    scripts.dev = scripts.dev ?? "vite";
    scripts.build = scripts.build ?? "vite build";
    scripts.start = "vite preview --host 0.0.0.0 --port 4173";

    packageJson.content = `${JSON.stringify(
      {
        ...parsed,
        private: parsed.private ?? true,
        type: parsed.type ?? "module",
        scripts,
        dependencies,
        devDependencies,
      },
      null,
      2,
    )}\n`;
  } catch {
    // keep original on parse failure
  }

  return next;
}

export function sanitizeViteConfigInFiles(files: GeneratedFile[]): GeneratedFile[] {
  const next = files.map((file) => ({ ...file }));
  const viteConfig = next.find((file) => file.path === "vite.config.ts" || file.path === "vite.config.js");
  if (!viteConfig) {
    return next;
  }

  let content = viteConfig.content;
  content = content.replace(/import\s+.*from\s+['"]sass-loader['"];?\s*\n?/g, "");
  content = content.replace(/import\s+.*from\s+['"]sass['"];?\s*\n?/g, "");
  content = content.replace(/["']tsconfig-paths-plugin["']/g, '"@vitejs/plugin-react"');

  if (content.includes("tsconfig-paths-plugin")) {
    content = content.replace(/tsconfig-paths-plugin/g, "vite-tsconfig-paths");
  }

  if (!content.includes("@vitejs/plugin-react")) {
    content = `import react from '@vitejs/plugin-react';\n${content}`;
  }
  if (!content.includes("plugins:") && content.includes("defineConfig")) {
    content = content.replace(
      /defineConfig\(\{/,
      "defineConfig({\n  plugins: [react()],",
    );
  }

  viteConfig.content = content;
  return next;
}

const VITE_ENV_D_TS = `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`;

function ensureViteEnvTypes(files: GeneratedFile[]): GeneratedFile[] {
  const next = files.map((file) => ({ ...file }));
  if (!next.some((file) => file.path === "src/vite-env.d.ts")) {
    next.push({ path: "src/vite-env.d.ts", content: VITE_ENV_D_TS });
  }
  return next;
}

export function ensureTsconfigFiles(files: GeneratedFile[]): GeneratedFile[] {
  const paths = new Set(files.map((file) => file.path));
  const next = [...files.map((file) => ({ ...file }))];

  if (!paths.has("tsconfig.json")) {
    next.push({
      path: "tsconfig.json",
      content: `{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
`,
    });
  }

  if (!paths.has("tsconfig.app.json")) {
    next.push({
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
    });
  }

  if (!paths.has("tsconfig.node.json")) {
    next.push({
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
    });
  }

  return next;
}

function pageNamesFromFiles(files: GeneratedFile[]): string[] {
  return files
    .filter((file) => /^src\/pages\/[^/]+\.tsx$/.test(file.path))
    .map((file) => file.path.replace(/^src\/pages\//, "").replace(/\.tsx$/, ""));
}

function rebuildAppForExistingPages(pageNames: string[]): string {
  const imports = pageNames
    .map((name) => `import ${name} from './pages/${name}';`)
    .join("\n");
  const routes = pageNames
    .map((name, index) => {
      const path = index === 0 ? "/" : `/${name.toLowerCase()}`;
      return `      <Route path="${path}" element={<${name} />} />`;
    })
    .join("\n");

  return `import { Routes, Route } from 'react-router-dom';
${imports || "const Placeholder = () => <div>Home</div>;"}

export default function App() {
  return (
    <Routes>
${routes || '      <Route path="/" element={<Placeholder />} />'}
    </Routes>
  );
}
`;
}

function alignAppWithExistingPages(files: GeneratedFile[]): GeneratedFile[] {
  const next = files.map((file) => ({ ...file }));
  const app = next.find((file) => file.path === "src/App.tsx");
  if (!app) {
    return next;
  }

  const pageNames = pageNamesFromFiles(next);
  if (pageNames.length === 0) {
    return next;
  }

  const importedPages = [...app.content.matchAll(/from ['"]\.\/pages\/(\w+)['"]/g)].map((match) => match[1]);
  const missingImports = importedPages.filter((name) => !pageNames.includes(name));

  if (missingImports.length > 0) {
    app.content = rebuildAppForExistingPages(pageNames);
  }

  return next;
}

function alignMainTsx(files: GeneratedFile[]): GeneratedFile[] {
  const next = files.map((file) => ({ ...file }));
  const main = next.find((file) => file.path === "src/main.tsx");
  if (!main) {
    return next;
  }

  if (main.content.includes("<Routes>") && main.content.includes("BrowserRouter")) {
    main.content = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
`;
  }

  return next;
}

export function sanitizeGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
  let next = sanitizePackageJsonInFiles(files);
  next = sanitizeViteConfigInFiles(next);
  next = ensureTsconfigFiles(next);
  next = ensureViteEnvTypes(next);
  next = alignAppWithExistingPages(next);
  next = alignMainTsx(next);
  return next;
}
