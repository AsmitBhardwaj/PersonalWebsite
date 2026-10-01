export interface Project {
  title: string;
  summary: string;
  technologies: string[];
  sourceUrl: string;
  demoUrl: string;
  accent: string;
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
      title: 'Signal Garden',
      summary: 'Sample project — an ambient workspace that turns complex activity into a calm, glanceable visual system.',
      technologies: ['React', 'TypeScript', 'WebGL'],
      sourceUrl: 'https://github.com/',
      demoUrl: 'https://example.com/',
      accent: '#85a8c4',
    },
    {
      title: 'Pocket Atlas',
      summary: 'Sample project — a beautifully focused travel journal for saving places, routes, and small discoveries.',
      technologies: ['Swift', 'MapKit', 'CloudKit'],
      sourceUrl: 'https://github.com/',
      demoUrl: 'https://example.com/',
      accent: '#d08a5b',
    },
    {
      title: 'Common Thread',
      summary: 'Sample project — a collaborative archive that helps small teams connect decisions to the work they shaped.',
      technologies: ['Next.js', 'Postgres', 'Node.js'],
      sourceUrl: 'https://github.com/',
      demoUrl: 'https://example.com/',
      accent: '#769b82',
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
