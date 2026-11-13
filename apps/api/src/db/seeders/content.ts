/**
 * Portfolio content, taken from Baiju's CV and personal statement.
 * Met Office entries use only wording already public on metoffice.gov.uk.
 */

export const profile = {
  name: "Baiju Joseph",
  title: "Software & Cloud Engineer",
  location: "London",
  tagline: "Building thoughtful software with TypeScript, Python and AWS.",
  summary:
    "Software engineer with 5+ years designing, building, testing and supporting cloud services in Python, TypeScript, Node.js and React. I write clean, typed, well-tested code, run the services I build and investigate issues in production. An earlier career in scientific digital products and as a Scrum Product Owner means I start from what users need and work closely with product and delivery colleagues.",
};

export const tags = [
  { slug: "web", label: "Web" },
  { slug: "cloud", label: "Cloud" },
  { slug: "data", label: "Data" },
] as const;

type TagSlug = (typeof tags)[number]["slug"];

/** When the seeded projects were published. Fixed, so re-seeding gives identical data. */
export const projectsPublishedAt = "2026-11-11T00:00:00.000Z";

export interface ProjectSeed {
  slug: string;
  title: string;
  organisation: string | null;
  summary: string;
  body: string;
  repoUrl: string | null;
  featured: boolean;
  tags: TagSlug[];
  technologies: string[];
}

export const projects: ProjectSeed[] = [
  {
    slug: "portfolio-platform",
    title: "Portfolio platform",
    organisation: null,
    summary:
      "This site: an illustrated London whose light follows your screen width, backed by a TypeScript API and PostgreSQL.",
    body: [
      "A personal portfolio built as a small production system rather than a static page.",
      "The front end is Next.js with a London riverside scene that moves from daylight to dusk to blue hour as the window widens. Behind it, an Express API in TypeScript serves content from PostgreSQL through Sequelize, with versioned migrations, full-text search and OpenAPI documentation.",
      "Everything runs in containers locally and deploys through GitHub Actions at zero hosting cost.",
    ].join("\n\n"),
    repoUrl: "https://github.com/starsagitarian/current_portfolio",
    featured: true,
    tags: ["web", "cloud"],
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Express",
      "PostgreSQL",
      "Sequelize",
      "Docker",
    ],
  },
  {
    slug: "book-content-pipelines",
    title: "Book content pipelines",
    organisation: "DK Publishing",
    summary:
      "Serverless pipelines turning XML and ONIX book data into JSON for the CMS: about six hours of manual work saved a week, import errors cut from about 8% to under 3%.",
    body: [
      "Editorial staff spent hours each week preparing book content for import by hand, and errors were common.",
      "I worked with them to understand the process, then built serverless XML-to-JSON and ONIX processing pipelines on AWS Lambda and S3, integrated with the CMS APIs and Make.com.",
      "The pipelines saved about six hours of manual work a week and cut import errors from about 8% to below 3%.",
    ].join("\n\n"),
    repoUrl: null,
    featured: true,
    tags: ["cloud", "data"],
    technologies: ["AWS Lambda", "Amazon S3", "Make.com", "XML", "ONIX"],
  },
  {
    slug: "dk-learning-microsite",
    title: "DK Learning microsite",
    organisation: "DK Publishing",
    summary:
      "Led development of the DK Learning and DK Super Readers microsite on React and Next.js, with a headless CMS, search and e-commerce.",
    body: [
      "I led development of the DK Learning / DK Super Readers microsite, a React and Next.js platform styled with Tailwind CSS.",
      "It integrates Hygraph as a headless CMS, Algolia for search and e-commerce APIs, and was delivered with product, editorial and technical teams.",
    ].join("\n\n"),
    repoUrl: null,
    featured: false,
    tags: ["web"],
    technologies: ["React", "Next.js", "Tailwind CSS", "Hygraph", "Algolia"],
  },
  {
    slug: "phonic-books-automation",
    title: "Phonic Books sales automation",
    organisation: "DK Publishing",
    summary:
      "Backend services automating sales and inventory for Phonic Books with Node.js, AWS Lambda, DynamoDB and Shopify's GraphQL APIs.",
    body: [
      "I designed backend services for Phonic Books that automate sales and inventory.",
      "They run on Node.js and AWS Lambda, keep state in DynamoDB and integrate with Shopify through its GraphQL APIs.",
    ].join("\n\n"),
    repoUrl: null,
    featured: false,
    tags: ["cloud"],
    technologies: ["Node.js", "AWS Lambda", "DynamoDB", "Shopify GraphQL"],
  },
  {
    slug: "lightning-observation",
    title: "Lightning observation",
    organisation: "Met Office",
    summary: "Python services processing data from an 11-sensor European lightning network.",
    body: [
      "Python services that ingest, transform and validate lightning observations from a European detection network for the Met Office's lightning data products.",
      "The services run as event-driven AWS workflows, with infrastructure as code and automated delivery. Quality comes from Pytest unit tests, Behave integration tests and mypy static typing.",
      "I also supported the live services: investigating defects, making maintenance changes and testing fixes before release.",
    ].join("\n\n"),
    repoUrl: null,
    featured: true,
    tags: ["cloud", "data"],
    technologies: [
      "Python",
      "AWS Lambda",
      "Amazon SQS",
      "Amazon S3",
      "DynamoDB",
      "AWS CDK",
      "Pytest",
      "Behave",
      "mypy",
    ],
  },
  {
    slug: "saas-data-services",
    title: "SaaS data services",
    organisation: "Innowiz IT Consultancy",
    summary:
      "React front ends and Python microservices with REST and GraphQL APIs for high-volume data processing, plus serverless chatbot work on AWS Bedrock.",
    body: [
      "I designed and built SaaS applications with React front ends and Python microservices (FastAPI, Flask), backed by PostgreSQL and DynamoDB.",
      "The REST and GraphQL APIs handle high-volume data processing, with Pandas, NumPy and mypy in the ETL workflows. I added logging and monitoring with CloudWatch and CloudTrail, and contributed to chatbot applications on AWS Bedrock.",
    ].join("\n\n"),
    repoUrl: null,
    featured: false,
    tags: ["web", "cloud", "data"],
    technologies: ["React", "FastAPI", "Flask", "PostgreSQL", "DynamoDB", "GraphQL", "AWS Bedrock"],
  },
  {
    slug: "remedic",
    title: "Remedic consultation prototype",
    organisation: "Sahusoft UK",
    summary:
      "A multilingual doctor–patient consultation proof of concept with authentication, real-time chat and onboarding.",
    body: [
      "Remedic is a multilingual doctor–patient consultation proof of concept, built and refined with stakeholders.",
      "I implemented authentication, real-time chat and onboarding with JWT, Socket.IO, GraphQL, React, TypeScript and Redux, working across the front end, back end and PostgreSQL.",
    ].join("\n\n"),
    repoUrl: null,
    featured: false,
    tags: ["web"],
    technologies: ["React", "TypeScript", "Redux", "Socket.IO", "GraphQL", "JWT", "PostgreSQL"],
  },
];

export const experiences = [
  {
    organisation: "Met Office",
    role: "Software Engineer",
    location: "Exeter",
    startDate: "2026-02-01",
    endDate: "2026-09-01",
    highlights: [
      "Built and supported Python services that ingest, transform and validate lightning observations from a European detection network for the Met Office's lightning data products.",
      "Built and maintained event-driven AWS workflows with Lambda, SQS, S3 and DynamoDB.",
      "Improved reliability with Behave integration tests, Pytest unit tests and mypy static typing.",
      "Supported live services: investigated defects, made maintenance changes and tested fixes before release.",
      "Contributed to CI/CD and infrastructure as code with AWS CDK, GitHub Actions and CodePipeline, and wrote technical documentation.",
    ],
  },
  {
    organisation: "Innowiz IT Consultancy",
    role: "AWS Developer (remote contractor)",
    location: "Exton, USA (remote)",
    startDate: "2024-09-01",
    endDate: "2026-01-01",
    highlights: [
      "Designed and built SaaS applications with React front ends and Python microservices (FastAPI, Flask) on PostgreSQL and DynamoDB.",
      "Developed REST and GraphQL APIs for high-volume data processing, with Pandas, NumPy and mypy in the ETL workflows.",
      "Added logging, monitoring and operational visibility with CloudWatch and CloudTrail.",
      "Applied Pytest and TDD in CI/CD pipelines, and contributed to AWS Bedrock chatbot applications on serverless infrastructure.",
    ],
  },
  {
    organisation: "DK Publishing",
    role: "Software Engineer (Full Stack and Cloud)",
    location: "London",
    startDate: "2021-04-01",
    endDate: "2023-12-01",
    highlights: [
      "Led development of the DK Learning / DK Super Readers microsite on React, Next.js, Tailwind CSS, Hygraph and Algolia.",
      "Built serverless XML-to-JSON and ONIX pipelines on AWS Lambda and S3, saving about six hours of manual work a week and cutting import errors from about 8% to below 3%.",
      "Designed backend services for Phonic Books with Node.js, Lambda, DynamoDB and Shopify GraphQL APIs to automate sales and inventory.",
      "Developed event-driven microservices with SQS, EventBridge and resilient error handling; managed deployment pipelines, ECS environments and automated testing with Jest and Cypress.",
    ],
  },
  {
    organisation: "Sahusoft UK",
    role: "Full Stack Engineer (contractor)",
    location: "London",
    startDate: "2020-04-01",
    endDate: "2021-03-01",
    highlights: [
      "Built Remedic, a multilingual doctor–patient consultation proof of concept, iterating with stakeholders.",
      "Implemented authentication, chat and onboarding with JWT, Socket.IO, GraphQL, React, TypeScript and Redux.",
      "Worked across front end, back end and PostgreSQL-backed features.",
    ],
  },
  {
    organisation: "Bayer (Monsanto India)",
    role: "Scrum Product Owner (Field Apps)",
    location: "Bengaluru",
    startDate: "2017-06-01",
    endDate: "2019-04-01",
    highlights: [
      "Owned the product lifecycle for 8+ mobile and web apps used by scientists in hybrid seed research.",
      "Led backlog refinement, sprint planning and Jira administration across scientific, business and software teams.",
      "Delivered product demonstrations and training to users across Europe, North America and Africa.",
    ],
  },
  {
    organisation: "QIAGEN / BIOBASE / Jubilant Biosys",
    role: "Scientific Data and Product Support",
    location: "Bengaluru",
    startDate: "2007-07-01",
    endDate: "2017-05-01",
    highlights: [
      "Supported scientific software and bioinformatics products, including QIAGEN Ingenuity Pathway Analysis, for researchers worldwide.",
      "Curated and quality-assured structured biological and disease data for commercial knowledge bases.",
    ],
  },
];

export const skills: Record<string, string[]> = {
  "Languages and frameworks": [
    "TypeScript",
    "JavaScript",
    "Python",
    "Node.js",
    "React",
    "Next.js",
    "FastAPI",
    "Flask",
    "SQL",
    "HTML and CSS",
  ],
  "Cloud and infrastructure": [
    "AWS Lambda",
    "Amazon S3",
    "Amazon SQS",
    "Amazon EC2",
    "Amazon ECS",
    "AWS CDK",
    "Docker",
    "Linux",
    "NGINX",
  ],
  "Data and APIs": [
    "PostgreSQL",
    "DynamoDB",
    "MongoDB",
    "REST",
    "GraphQL",
    "EventBridge",
    "ETL pipelines",
    "Pandas",
    "NumPy",
  ],
  "Testing and delivery": [
    "TDD",
    "Pytest",
    "Behave",
    "mypy",
    "Jest",
    "Cypress",
    "Playwright",
    "GitHub Actions",
    "GitLab CI",
    "AWS CodePipeline",
  ],
  "Security and operations": ["IAM", "CloudTrail", "CloudWatch", "JWT"],
  "Ways of working": [
    "Scrum",
    "User stories",
    "Backlog refinement",
    "Stakeholder training",
    "Jira",
  ],
};

export const certifications = [
  {
    name: "AWS Certified Developer – Associate (DVA-C02)",
    issuer: "Amazon Web Services",
    issuedOn: "2025-06-01",
  },
  { name: "Certified ScrumMaster (CSM)", issuer: "Scrum Alliance", issuedOn: "2019-03-01" },
  {
    name: "Certified Scrum Product Owner (CSPO)",
    issuer: "Scrum Alliance",
    issuedOn: "2019-02-01",
  },
];

export const education = [
  {
    institution: "Codeworks",
    qualification: "Software Engineering Immersive",
    location: "City of London",
    endYear: null,
  },
  {
    institution: "Bangalore University",
    qualification: "MSc Biotechnology",
    location: "Bengaluru",
    endYear: 2007,
  },
];
