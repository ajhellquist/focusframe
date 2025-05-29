/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This will ensure that only files ending with '.page.tsx', '.page.ts',
  // '.page.jsx', or '.page.js' are treated as pages.
  // You'll need to rename your existing pages to follow this convention
  // (e.g., `pages/index.tsx` to `pages/index.page.tsx`).
  // OR, a less disruptive approach is to keep the default pageExtensions
  // and explicitly tell webpack to ignore __tests__ directories.
  //
  // Let's try a webpack configuration first to avoid renaming all page files.
  webpack: (config, { isServer }) => {
    // Add a rule to ignore __tests__ directories
    // This is generally safer than altering pageExtensions for this specific problem.
    config.module.rules.push({
      test: /__tests__\//,
      loader: 'ignore-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
