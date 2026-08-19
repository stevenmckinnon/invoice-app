import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @formepdf/core loads a WASM binary relative to its own __dirname at
  // runtime (wasm-pack's Node target) — bundling breaks that lookup. And
  // @formepdf/react must be external too: @formepdf/core dynamically
  // imports it internally to serialize the JSX tree, identifying most
  // components (Page, View, Table, ...) by reference equality against its
  // own copy — a second, bundled copy of @formepdf/react here would never
  // match, silently dropping everything below <Document>.
  serverExternalPackages: ["@formepdf/core", "@formepdf/react"],
};

export default nextConfig;
