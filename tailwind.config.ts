import type { Config } from 'tailwindcss';

// Design system: "inspection tag" — the physical world of turnover cleaning
// (tags, stamps, clipboards) rather than a generic SaaS look.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F7F5',      // base background — clipboard paper, not cream-latte
        ink: '#1C1E1B',        // near-black charcoal for primary text
        graphite: '#6B6F66',   // warm gray for secondary text
        line: '#DEDDD3',       // hairline borders / perforation lines
        // Status colors carry real meaning — job state, not decoration
        clean: '#0E7C7B',      // teal — job complete / property ready
        progress: '#E8A33D',   // amber — job in progress / scheduled
        attention: '#C1443C',  // red — overdue / needs attention
        stamp: '#1C1E1B',      // rubber-stamp ink color
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        tag: ['"IBM Plex Mono"', 'monospace'], // job IDs, timestamps — stamped-tag numerals
      },
      borderRadius: {
        tag: '2px', // sharp, stamped-tag corners rather than soft SaaS radii
      },
    },
  },
  plugins: [],
};

export default config;
