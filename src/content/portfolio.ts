import { platterProjectStatus } from '../boot/bootConfig';

const platterStatus = platterProjectStatus();

export interface Project {
  title: string;
  summary: string;
  technologies: string[];
  sourceUrl: string;
  demoUrl: string;
  accent: string;
  description?: string;
  /** Platform and release state, e.g. "iOS · On the App Store". */
  status?: string;
  /** Where the status text links, if anywhere. */
  statusUrl?: string;
  role?: string;
  highlights?: string[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location?: string;
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
  /** Optional large heading for About. Falls back to the name. */
  headline?: string;
  /** One entry per paragraph. */
  biography: string[];
  currentFocus?: string;
  location: string;
  email: string;
  social: { github: string; linkedin: string };
  skillGroups: { label: string; items: string[] }[];
  interests: string[];
  projects: Project[];
  experience: ExperienceItem[];
  /** Optional line shown above the Now list. */
  notesIntro?: string;
  notes: Note[];
  music: { title: string; artist: string; note: string };
  wallpaperPath: string;
}

/** Replace placeholder copy and URLs here; UI components read exclusively from this object. */
export const portfolio: PortfolioContent = {
  name: 'Asmit Bhardwaj',
  statusName: 'Asmit',
  headline: 'Hi, I\u2019m Asmit.',
  biography: [
    'I\u2019m a Computer Science student at Gettysburg College (class of 2028), minoring in Mathematics and Economics. I build products, and I treat every internship and project as founder training.',
    'Right now that means Platter, an iOS app I built solo that turns recipe Reels, TikToks and blog posts into clean, cookable recipes, with pantry-aware suggestions and budget meal planning.',
    'I taught myself to code on my first laptop, an old HP, and I haven\u2019t stopped since.',
    'On campus I\u2019m President of Sangam (100+ members) and Secretary of ACM.',
  ],
  location: 'Gettysburg, PA',
  email: 'bharas01@gettysburg.edu',
  social: {
    github: 'https://github.com/AsmitBhardwaj',
    linkedin: 'https://linkedin.com/in/asmitbhardwaj',
  },
  skillGroups: [
    { label: 'Languages', items: ['Swift', 'Python', 'TypeScript/React', 'Java', 'JavaScript', 'SQL'] },
    { label: 'Frameworks & libraries', items: ['FastAPI', 'SwiftUI', 'pandas', 'NumPy', 'scikit-learn'] },
    { label: 'Tools', items: ['Claude Code', 'GitHub Copilot', 'Git'] },
  ],
  interests: ['Marathon running', 'FC Barcelona (lifelong)', 'Cricket', 'Football analytics'],
  projects: [
    {
      title: 'Platter',
      summary: 'Save recipes from Instagram, TikTok and food blogs, then cook with what you\u2019ve already got.',
      technologies: ['SwiftUI', 'Swift', 'Python', 'FastAPI', 'PostgreSQL', 'OpenAI', 'Railway', 'StoreKit'],
      sourceUrl: '',
      demoUrl: 'https://platterapp.tech',
      accent: '#637858',
      status: platterStatus.text,
      statusUrl: platterStatus.href,
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
    {
      title: 'The Professor',
      summary: 'A VS Code extension that explains code step by step, with time and space complexity analysis.',
      technologies: ['TypeScript', 'JavaScript', 'Python', 'LLM APIs'],
      sourceUrl: '',
      demoUrl: '',
      accent: '#4f6d8f',
      status: 'Won YCPHacks 2024',
      role: 'Builder',
      description: 'A VS Code extension that makes code comprehension more accessible, delivering context-aware, step-by-step explanations and complexity analysis directly inside the editor.',
      highlights: [
        'Self-built LLM inference pipeline with modular prompt orchestration and structured output parsing.',
        'Low-latency design enabling real-time complexity analysis without leaving the editor.',
      ],
    },
  ],
  experience: [
    {
      role: 'AI Engineering Intern', company: 'Tech Mahindra Americas', period: 'May 2026 \u2013 Present', location: 'Plano, TX (Hybrid)',
      highlights: [
        'Built a Python benchmarking suite evaluating Gurobi against commercial and open-source solvers (CPLEX, FICO Xpress, HiGHS, OR-Tools), with reproducible test harnesses across MIPLIB and ROADEF benchmark datasets.',
        'Modeled and solved a Capacitated Vehicle Routing Problem in Gurobi, independently validating correctness and test coverage.',
      ],
      technologies: ['Python', 'Gurobi', 'CPLEX', 'OR-Tools'],
    },
    {
      role: 'Web Development Intern', company: 'Gettysburg College', period: 'Jan 2026 \u2013 May 2026',
      highlights: [
        'Coordinated a database migration across an 8-person engineering team, owning scope and sequencing for 2,000 pages of legacy content with zero data loss.',
        'Built automated failover infrastructure, raising availability from 99.0% to 99.99%.',
        'Cut average API latency 45% and doubled throughput through query profiling, schema redesign and indexing.',
      ],
      technologies: [],
    },
    {
      role: 'Research Assistant', company: 'AIMI, Stanford University', period: 'Aug 2024 \u2013 Dec 2024', location: 'Remote',
      highlights: [
        'Built Python data pipelines (pandas, NumPy, scikit-learn) analyzing glaucoma and ophthalmological disease prevalence in patient data from India.',
        'Applied clustering and trend detection to identify temporal disease progression patterns, supporting epidemiological hypothesis validation.',
        'Shared findings through visualizations and reports with public health and clinical teams at eye hospitals in India.',
      ],
      technologies: ['Python', 'pandas', 'NumPy', 'scikit-learn'],
    },
  ],
  notesIntro: 'What I\u2019m doing right now.',
  notes: [
    { title: 'AI engineering at Tech Mahindra Americas', date: '', excerpt: 'Optimization solvers and vehicle routing.', body: 'AI engineering internship at Tech Mahindra Americas: optimization solvers and vehicle routing.' },
    { title: 'Shipping Platter v1.0, building v1.1', date: '', excerpt: 'Nutrition, budget meal planning and a smarter grocery list.', body: 'Shipping Platter v1.0 to the App Store and building v1.1: nutrition, budget meal planning and a smarter grocery list.' },
    { title: 'Summer 2027 internships', date: '', excerpt: 'Looking for software engineering internships.', body: 'Looking for Summer 2027 software engineering internships.' },
  ],
  music: { title: 'Night Transit', artist: 'Placeholder Artist', note: 'Replace title and artist in src/content/portfolio.ts. Audio does not autoplay.' },
  wallpaperPath: '/assets/wallpaper/winter-photo.png',
};
