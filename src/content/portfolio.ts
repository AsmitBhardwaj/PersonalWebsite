export interface Project {
  title: string;
  summary: string;
  technologies: string[];
  sourceUrl: string;
  demoUrl: string;
  accent: string;
  description?: string;
  /** Platform and release state, e.g. "iOS · In App Store review". */
  status?: string;
  role?: string;
  highlights?: string[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  highlights: string[];
  technologies: string[];
}

export interface Note {
  title: string;
  date: string;
  excerpt: string;
  body: string;
}

export interface PortfolioContent {
  name: string;
  statusName: string;
  biography: string;
  currentFocus: string;
  location: string;
  email: string;
  social: { github: string; linkedin: string };
  technologies: string[];
  interests: string[];
  projects: Project[];
  experience: ExperienceItem[];
  notes: Note[];
  music: { title: string; artist: string; note: string };
  wallpaperPath: string;
  resumePath: string;
}

/** Replace placeholder copy and URLs here; UI components read exclusively from this object. */
export const portfolio: PortfolioContent = {
  name: 'Asmit Bhardwaj',
  statusName: 'Asmit',
  biography: 'I build thoughtful digital products where engineering, interaction, and visual craft meet. This is placeholder copy ready for your story.',
  currentFocus: 'Creating expressive, reliable interfaces and learning from the details that make products feel alive.',
  location: 'Your city · Available worldwide',
  email: 'hello@example.com',
  social: {
    github: 'https://github.com/',
    linkedin: 'https://www.linkedin.com/',
  },
  technologies: ['TypeScript', 'React', 'Node.js', 'Swift', 'Python', 'Figma'],
  interests: ['Product craft', 'Creative coding', 'Photography', 'Music'],
  projects: [
    {
      title: 'Platter',
      summary: 'Save recipes from Instagram, TikTok and food blogs, then cook with what you\u2019ve already got.',
      technologies: ['SwiftUI', 'Swift', 'Python', 'FastAPI', 'PostgreSQL', 'OpenAI', 'Railway', 'StoreKit'],
      sourceUrl: '',
      demoUrl: 'https://platterapp.tech',
      accent: '#637858',
      status: 'iOS · In App Store review',
      role: 'Solo founder & engineer: product, iOS, backend',
      description: 'An iOS app that turns a recipe Reel, TikTok or blog link into a clean, structured recipe with ingredients, steps and timers. Share a link from any app and it imports in seconds. Includes a guided Cook Mode with per-step timers, a pantry that suggests recipes from what you already have, and budget-aware weekly meal planning that generates a grocery list for only what\u2019s missing.',
      highlights: [
        'Async job pipeline on FastAPI: Instagram caption extraction, TikTok via yt-dlp, and blog import via schema.org JSON-LD with an LLM fallback.',
        'Shared cross-user recipe cache keyed by canonical video ID, so one import serves every future user of that link.',
        'Detects publisher bot-blocking and falls back to a paste-the-recipe flow instead of failing silently.',
        'Pantry matching with word-boundary ingredient normalization and dish-level dedup, with generation as a fallback when matches are thin.',
        'Budget meal planning with regional cost adjustment.',
        'Platter Pro subscriptions via StoreKit, plus per-account LLM cost tracking and a hard monthly spend cap.',
      ],
    },
  ],
  experience: [
    {
      role: 'Role Title', company: 'Company Name', period: '2024 — Present',
      highlights: ['Describe the product or system you helped build.', 'Add a concise, truthful outcome or area of ownership.'],
      technologies: ['TypeScript', 'React', 'Design systems'],
    },
    {
      role: 'Previous Role', company: 'Previous Company', period: '2022 — 2024',
      highlights: ['Describe a meaningful responsibility.', 'Replace this with a specific contribution.'],
      technologies: ['JavaScript', 'Node.js', 'Product'],
    },
  ],
  notes: [
    { title: 'Designing for delight, carefully', date: 'Sep 18', excerpt: 'A note on motion, restraint, and earning attention.', body: 'Sample note: Delight works best when it clarifies state, rewards curiosity, or makes an interaction easier to understand. Replace this entry with your own writing.' },
    { title: 'What old hardware gets right', date: 'Aug 04', excerpt: 'Tactility gives software a sense of consequence.', body: 'Sample note: Physical interfaces made state visible. A click, a hinge, or a changing silhouette told you what happened before the screen did.' },
    { title: 'Small tools, long lives', date: 'Jun 22', excerpt: 'Why focused software can outlast bigger platforms.', body: 'Sample note: The tools we keep often do one job with a point of view. This placeholder can become a short essay or link to longer writing.' },
  ],
  music: { title: 'Night Transit', artist: 'Placeholder Artist', note: 'Replace title and artist in src/content/portfolio.ts. Audio does not autoplay.' },
  wallpaperPath: '/assets/wallpaper/winter-photo.png',
  resumePath: '/resume-placeholder.pdf',
};
