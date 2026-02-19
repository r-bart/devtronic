import { join } from 'node:path';
import { fileExists, readFile } from '../utils/files.js';

export interface StackAnalysis {
  stateManagement: DetectedTech[];
  dataFetching: DetectedTech[];
  orm: DetectedTech[];
  testing: DetectedTech[];
  ui: DetectedTech[];
  validation: DetectedTech[];
  api: DetectedTech[];
}

export interface DetectedTech {
  name: string;
  package: string;
  version: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface TechDetector {
  name: string;
  packages: string[];
  category: keyof StackAnalysis;
}

const TECH_DETECTORS: TechDetector[] = [
  // State Management
  { name: 'Zustand', packages: ['zustand'], category: 'stateManagement' },
  { name: 'Redux Toolkit', packages: ['@reduxjs/toolkit'], category: 'stateManagement' },
  { name: 'Redux', packages: ['redux', 'react-redux'], category: 'stateManagement' },
  { name: 'Jotai', packages: ['jotai'], category: 'stateManagement' },
  { name: 'Recoil', packages: ['recoil'], category: 'stateManagement' },
  { name: 'MobX', packages: ['mobx', 'mobx-react'], category: 'stateManagement' },
  { name: 'Valtio', packages: ['valtio'], category: 'stateManagement' },
  { name: 'XState', packages: ['xstate', '@xstate/react'], category: 'stateManagement' },

  // Data Fetching
  { name: 'React Query', packages: ['@tanstack/react-query', 'react-query'], category: 'dataFetching' },
  { name: 'SWR', packages: ['swr'], category: 'dataFetching' },
  { name: 'Apollo Client', packages: ['@apollo/client'], category: 'dataFetching' },
  { name: 'URQL', packages: ['urql', '@urql/core'], category: 'dataFetching' },
  { name: 'tRPC', packages: ['@trpc/client', '@trpc/react-query'], category: 'dataFetching' },
  { name: 'Axios', packages: ['axios'], category: 'dataFetching' },

  // ORM / Database
  { name: 'Prisma', packages: ['prisma', '@prisma/client'], category: 'orm' },
  { name: 'Drizzle', packages: ['drizzle-orm'], category: 'orm' },
  { name: 'TypeORM', packages: ['typeorm'], category: 'orm' },
  { name: 'Mongoose', packages: ['mongoose'], category: 'orm' },
  { name: 'Sequelize', packages: ['sequelize'], category: 'orm' },
  { name: 'Kysely', packages: ['kysely'], category: 'orm' },

  // Testing
  { name: 'Vitest', packages: ['vitest'], category: 'testing' },
  { name: 'Jest', packages: ['jest'], category: 'testing' },
  { name: 'Playwright', packages: ['@playwright/test', 'playwright'], category: 'testing' },
  { name: 'Cypress', packages: ['cypress'], category: 'testing' },
  { name: 'Testing Library', packages: ['@testing-library/react', '@testing-library/vue'], category: 'testing' },

  // UI Libraries
  { name: 'Tailwind CSS', packages: ['tailwindcss'], category: 'ui' },
  { name: 'Chakra UI', packages: ['@chakra-ui/react'], category: 'ui' },
  { name: 'Material UI', packages: ['@mui/material'], category: 'ui' },
  { name: 'Ant Design', packages: ['antd'], category: 'ui' },
  { name: 'Radix UI', packages: ['@radix-ui/react-dialog', '@radix-ui/themes'], category: 'ui' },
  { name: 'shadcn/ui', packages: ['@radix-ui/react-slot'], category: 'ui' }, // shadcn uses radix
  { name: 'Styled Components', packages: ['styled-components'], category: 'ui' },
  { name: 'Emotion', packages: ['@emotion/react', '@emotion/styled'], category: 'ui' },

  // Validation
  { name: 'Zod', packages: ['zod'], category: 'validation' },
  { name: 'Yup', packages: ['yup'], category: 'validation' },
  { name: 'Valibot', packages: ['valibot'], category: 'validation' },
  { name: 'io-ts', packages: ['io-ts'], category: 'validation' },

  // API
  { name: 'Express', packages: ['express'], category: 'api' },
  { name: 'Fastify', packages: ['fastify'], category: 'api' },
  { name: 'Hono', packages: ['hono'], category: 'api' },
  { name: 'NestJS', packages: ['@nestjs/core'], category: 'api' },
  { name: 'tRPC Server', packages: ['@trpc/server'], category: 'api' },
  { name: 'GraphQL', packages: ['graphql', '@graphql-tools/schema'], category: 'api' },
];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(targetDir: string): PackageJson | null {
  const packageJsonPath = join(targetDir, 'package.json');
  if (!fileExists(packageJsonPath)) {
    return null;
  }
  try {
    return JSON.parse(readFile(packageJsonPath));
  } catch {
    return null;
  }
}

export function analyzeStack(targetDir: string): StackAnalysis {
  const result: StackAnalysis = {
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    api: [],
  };

  const packageJson = readPackageJson(targetDir);
  if (!packageJson) {
    return result;
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const detector of TECH_DETECTORS) {
    for (const pkg of detector.packages) {
      if (allDeps[pkg]) {
        // Check if we already have this tech (avoid duplicates from multiple packages)
        const existing = result[detector.category].find((t) => t.name === detector.name);
        if (!existing) {
          result[detector.category].push({
            name: detector.name,
            package: pkg,
            version: allDeps[pkg].replace(/[\^~]/g, ''),
            confidence: 'high',
          });
        }
        break; // Found one package, no need to check others for same tech
      }
    }
  }

  return result;
}

export function getDetectedTechNames(stack: StackAnalysis): string[] {
  const names: string[] = [];
  for (const category of Object.values(stack)) {
    for (const tech of category) {
      names.push(tech.name);
    }
  }
  return names;
}

export function hasAnyTech(stack: StackAnalysis): boolean {
  return Object.values(stack).some((category) => category.length > 0);
}
