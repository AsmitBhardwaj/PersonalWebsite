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
  biography: 'I\u2019m a Computer Science student at Gettysburg College (class of 2028), minoring in Mathematics and Economics. I build products, and I treat every internship and project as founder training. I taught myself to code on my first laptop, an old HP, and I haven\u2019t stopped since. At Gettysburg I\u2019m involved with ACM, Sangam, Math Club and Consulting Club.',
  currentFocus: 'Right now that means Platter, an iOS app I built solo that turns recipe Reels, TikToks and blog posts into clean, cookable recipes, with pantry-aware suggestions and budget meal planning.',
  location: 'Your city · Available worldwide',
  email: 'hello@example.com',
  social: {
    github: 'https://github.com/AsmitBhardwaj',
    linkedin: 'https://www.linkedin.com/',
  },
  technologies: ['TypeScript', 'React', 'Node.js', 'Swift', 'Python', 'Figma'],
  interests: ['Marathon running', 'FC Barcelona (lifelong)', 'Cricket', 'Football analytics'],
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
      role: 'AI Engineering Intern', company: 'Tech Mahindra', period: '',
      highlights: [
        'Worked on Yantr.ai, a field service management platform.',
        'Built a MILP solver benchmarking suite comparing Gurobi, IBM CPLEX, FICO Xpress and Google OR-Tools on the ROADEF 2007 Challenge dataset.',
        'Turned the results into a solver procurement recommendation (CPLEX), presented with a full deck and literature review.',
      ],
      technologies: [],
    },
    { role: 'Research Assistant', company: 'Stanford AIMI', period: '', highlights: [], technologies: [] },
    { role: 'Web Development Intern', company: 'Gettysburg College', period: '', highlights: [], technologies: [] },
  ],
  notes: [
    { title: 'Shipping Platter v1.0, building v1.1', date: '', excerpt: 'Nutrition, budget meal planning, and a smarter grocery list.', body: 'Shipping Platter v1.0 to the App Store and building v1.1: nutrition, budget meal planning, and a smarter grocery list.' },
    { title: 'Summer 2027 internships', date: '', excerpt: 'Looking for software engineering internships.', body: 'Looking for Summer 2027 software engineering internships.' },
  ],
  music: { title: 'Night Transit', artist: 'Placeholder Artist', note: 'Replace title and artist in src/content/portfolio.ts. Audio does not autoplay.' },
  wallpaperPath: '/assets/wallpaper/winter-photo.png',
  resumePath: '/resume-placeholder.pdf',
};
