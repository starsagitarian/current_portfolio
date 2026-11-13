/** Facts about the site owner that both the web app and the API present. */
export const site = {
  name: "Baiju Joseph",
  brand: "starsagitarian",
  title: "Software & Cloud Engineer",
  tagline: "Building thoughtful software with TypeScript, Python and AWS.",
  url: "https://starsagitarian.vercel.app",
  links: {
    github: "https://github.com/starsagitarian",
    linkedin: "https://www.linkedin.com/in/baiju-joseph-aws-csm-cspo-8a8aa37/",
  },
} as const;

export type Site = typeof site;
