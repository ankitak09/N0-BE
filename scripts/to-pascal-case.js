#!/usr/bin/env node
/** Usage: node scripts/to-pascal-case.js billing → Billing */
const slug = process.argv[2] ?? "";
const pascal = slug
  .split("-")
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("");
process.stdout.write(pascal);
