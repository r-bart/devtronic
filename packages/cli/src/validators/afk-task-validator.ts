/**
 * AFK Task Validator
 *
 * Analyzes GitHub issues and task descriptions for autonomous execution readiness.
 * Calculates viability score (0-100) across 5 dimensions and detects quality gaps.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TaskGap {
  type: 'missing-criteria' | 'low-coverage' | 'architectural-risk' | 'external-dependency' | 'scope-creep';
  message: string;
  suggestion?: string;
}

export interface TaskAnalysis {
  totalScore: number;
  clarityScore: number;
  scopeScore: number;
  precedentScore: number;
  coverageScore: number;
  dependencyScore: number;
  filesAffected?: string[];
  gaps: TaskGap[];
  clarityDetails?: {
    hasAcceptanceCriteria: boolean;
    measurableOutcomes: number;
    keywords: string[];
  };
}

export interface ParsedTaskInput {
  type: 'github-url' | 'plain-text';
  content?: string;
  owner?: string;
  repo?: string;
  issueNumber?: number;
  raw: string;
}

// ============================================================================
// INPUT PARSING
// ============================================================================

export function parseTaskInput(input: string): ParsedTaskInput {
  const trimmed = input.trim();

  // GitHub URL pattern: https://github.com/owner/repo/issues/123
  const githubMatch = trimmed.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (githubMatch) {
    return {
      type: 'github-url',
      owner: githubMatch[1],
      repo: githubMatch[2],
      issueNumber: parseInt(githubMatch[3], 10),
      raw: trimmed,
    };
  }

  // Plain text description
  return {
    type: 'plain-text',
    content: trimmed,
    raw: trimmed,
  };
}

// ============================================================================
// DIMENSION SCORING: CLARITY (25%)
// ============================================================================

export function calculateClarityScore(description: string): number {
  if (!description || description.trim().length === 0) {
    return 0;
  }

  const lowerDesc = description.toLowerCase();
  let score = 0;

  // Keywords indicating measurable outcomes
  const clarityKeywords = ['returns', 'validates', 'throws', 'creates', 'modifies', 'updates', 'deletes'];
  const foundKeywords = clarityKeywords.filter((kw) => lowerDesc.includes(kw));
  const keywordScore = Math.min(100, (foundKeywords.length / clarityKeywords.length) * 100);

  // Measurable outcomes (look for patterns like "returns X", "if Y then Z")
  const measurablePatterns = /returns\s+\{|returns\s+[a-z]+|validates\s+\w+|throws\s+\w+|if\s+\w+\s+then|when\s+\w+/gi;
  const matches = description.match(measurablePatterns) || [];
  const outcomeScore = Math.min(100, (matches.length / 3) * 100);

  // Acceptance criteria indicators — explicit header OR 3+ inline measurable outcomes
  const hasExplicitCriteria = /acceptance criter|acceptance criteria|criteria:|-\s*\[/i.test(description);
  const hasInlineOutcomes = matches.length >= 3;
  const criteriaScore = hasExplicitCriteria || hasInlineOutcomes ? 80 : 20;

  // Vague language (negative scoring)
  const vagueWords = ['better', 'improve', 'fix', 'handle', 'work', 'stuff'];
  const vagueness = vagueWords.filter((word) => lowerDesc.includes(word)).length;
  const vagueScore = Math.max(0, 100 - vagueness * 15);

  // Combine scores
  score = (keywordScore * 0.3 + criteriaScore * 0.3 + outcomeScore * 0.2 + vagueScore * 0.2) * 0.9;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// DIMENSION SCORING: SCOPE (25%)
// ============================================================================

export function calculateScopeScore(description: string): number {
  if (!description || description.trim().length === 0) {
    return 50;
  }

  const lowerDesc = description.toLowerCase();
  let score = 100;

  // Architectural keywords (penalize heavily)
  const architecturalKeywords = [
    'refactor',
    'migrate',
    'redesign',
    'rewrite',
    'architecture',
    'restructure',
    'overhaul',
  ];
  for (const keyword of architecturalKeywords) {
    if (lowerDesc.includes(keyword)) {
      score -= 25;
    }
  }

  // File count estimation (regex for file paths)
  const filePaths = description.match(/[a-z0-9/_-]+\.(ts|tsx|js|jsx)/gi) || [];
  const fileCount = filePaths.length;

  if (fileCount > 5) score -= 20;
  if (fileCount > 10) score -= 30;

  // Cross-layer detection (mentions of multiple layers)
  const layers = ['domain', 'application', 'infrastructure', 'presentation'];
  const layersMentioned = layers.filter((layer) => lowerDesc.includes(layer)).length;

  if (layersMentioned >= 3) {
    score -= 25; // Multi-layer changes are risky
  }

  // Multiple features
  if (/feature\s+1|feature\s+2|feature\s+3/i.test(description)) {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// DIMENSION SCORING: PRECEDENT (20%)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculatePrecedentScore(_description: string, _context?: unknown): number {
  // This would require codebase grep in real implementation
  // For now, return neutral score indicating analysis needed
  // In actual usage, this would search for similar patterns
  return 50; // Neutral — requires actual codebase search
}

// ============================================================================
// DIMENSION SCORING: COVERAGE (20%)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateCoverageScore(_files?: string[], _report?: unknown): number {
  // This would require running vitest --coverage
  // For now, return 0 indicating coverage data unavailable
  // In actual usage, would parse coverage JSON
  return 0; // Unknown — requires vitest execution
}

// ============================================================================
// DIMENSION SCORING: DEPENDENCIES (10%)
// ============================================================================

export function calculateDependencyScore(description: string): number {
  if (!description || description.trim().length === 0) {
    return 100;
  }

  const lowerDesc = description.toLowerCase();
  let score = 100;

  // Dependency keywords
  const dependencyKeywords = ['depends on', 'pr #', 'issue #', 'requires', 'after', 'blocked by', 'wait for'];

  for (const keyword of dependencyKeywords) {
    if (lowerDesc.includes(keyword)) {
      score -= 25;
    }
  }

  // GitHub references
  if (/#\d+/i.test(description)) {
    score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// WEIGHTED TOTAL SCORE
// ============================================================================

export function calculateTotalScore(scores: {
  clarityScore: number;
  scopeScore: number;
  precedentScore?: number;
  coverageScore?: number;
  dependencyScore?: number;
}): number {
  const clarity = scores.clarityScore || 0;
  const scope = scores.scopeScore || 0;
  const precedent = scores.precedentScore ?? 50; // Default to neutral
  const coverage = scores.coverageScore ?? 0;
  const dependency = scores.dependencyScore || 0;

  // Weighted formula: clarity(25%) + scope(25%) + precedent(20%) + coverage(20%) + dependency(10%)
  const total = clarity * 0.25 + scope * 0.25 + precedent * 0.2 + coverage * 0.2 + dependency * 0.1;

  return Math.max(0, Math.min(100, Math.round(total)));
}

// ============================================================================
// GAP DETECTION
// ============================================================================

export function detectGaps(
  description: string,
  scores?: Partial<TaskAnalysis>
): TaskGap[] {
  const gaps: TaskGap[] = [];

  if (!description) {
    return gaps;
  }

  const lowerDesc = description.toLowerCase();
  const clarityScore = scores?.clarityScore ?? 0;
  const coverageScore = scores?.coverageScore ?? 0;
  const scopeScore = scores?.scopeScore ?? 0;

  // Gap 1: Missing acceptance criteria
  if (clarityScore < 50) {
    gaps.push({
      type: 'missing-criteria',
      message: 'No measurable acceptance criteria found',
      suggestion: `Add explicit criteria like:
- Returns [result] when given [input]
- Validates [constraint]
- Throws error if [condition]`,
    });
  }

  // Gap 2: Low coverage risk
  if (coverageScore < 60 && coverageScore > 0) {
    gaps.push({
      type: 'low-coverage',
      message: `Coverage is ${coverageScore}% in affected files`,
      suggestion: 'Consider: (1) Writing integration tests first, or (2) Using HITL mode',
    });
  }

  // Gap 3: Architectural risk
  const architecturalKeywords = ['refactor', 'migrate', 'redesign', 'rewrite', 'architecture'];
  if (architecturalKeywords.some((kw) => lowerDesc.includes(kw))) {
    gaps.push({
      type: 'architectural-risk',
      message: 'Task affects system design',
      suggestion: 'This is an architectural change. HITL mode strongly recommended. Consider breaking into smaller tasks.',
    });
  }

  // Gap 4: External dependencies
  const dependencyKeywords = ['depends on', 'pr #', 'issue #', 'requires', 'after', 'blocked by'];
  if (dependencyKeywords.some((kw) => lowerDesc.includes(kw))) {
    gaps.push({
      type: 'external-dependency',
      message: 'Task depends on external work',
      suggestion: 'Consider: (1) Waiting for dependency, or (2) Splitting into independent subtask',
    });
  }

  // Gap 5: Scope creep (multiple features)
  if (/feature\s+1|feature\s+2|feature\s+3/i.test(description)) {
    gaps.push({
      type: 'scope-creep',
      message: 'Multiple features detected',
      suggestion: 'Split into separate tasks:\n1. Feature A\n2. Feature B\n3. Feature C',
    });
  }

  // Gap 6: Low scope score (too broad)
  if (scopeScore < 40) {
    gaps.push({
      type: 'scope-creep',
      message: 'Scope is too broad or unclear',
      suggestion: 'Can you narrow this to a single feature? List affected files.',
    });
  }

  return gaps;
}

// ============================================================================
// FULL ANALYSIS
// ============================================================================

export function analyzeTaskDescription(description: string): TaskAnalysis {
  const clarityScore = calculateClarityScore(description);
  const scopeScore = calculateScopeScore(description);
  const precedentScore = calculatePrecedentScore(description);
  const coverageScore = calculateCoverageScore();
  const dependencyScore = calculateDependencyScore(description);

  const totalScore = calculateTotalScore({
    clarityScore,
    scopeScore,
    precedentScore,
    coverageScore,
    dependencyScore,
  });

  const gaps = detectGaps(description, {
    clarityScore,
    scopeScore,
    coverageScore,
    dependencyScore,
  });

  // Extract files mentioned
  const filesAffected = (description.match(/[a-z0-9/_-]+\.(ts|tsx|js|jsx)/gi) || []).slice(0, 10);

  return {
    totalScore,
    clarityScore,
    scopeScore,
    precedentScore,
    coverageScore,
    dependencyScore,
    filesAffected: [...new Set(filesAffected)],
    gaps,
    clarityDetails: {
      hasAcceptanceCriteria: /acceptance criter|acceptance criteria|criteria:|^\s*-\s*\[/im.test(
        description
      ),
      measurableOutcomes: (description.match(/returns|validates|throws/gi) || []).length,
      keywords: (description.match(/returns|validates|throws|creates|modifies/gi) || []).map((k) =>
        k.toLowerCase()
      ),
    },
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

export function generateReport(analysis: Partial<TaskAnalysis>): string {
  const score = analysis.totalScore ?? 0;
  const clarity = analysis.clarityScore ?? 0;
  const scope = analysis.scopeScore ?? 0;
  const precedent = analysis.precedentScore ?? 0;
  const coverage = analysis.coverageScore ?? 0;
  const dependency = analysis.dependencyScore ?? 0;
  const gaps = analysis.gaps ?? [];

  // Score emoji based on viability
  let statusEmoji = '❌';
  let statusText = 'Needs Refinement';
  if (score >= 70) {
    statusEmoji = '✅';
    statusText = 'AFK Viable';
  } else if (score >= 40) {
    statusEmoji = '⚠️';
    statusText = 'Medium Risk (HITL Recommended)';
  }

  // Dimension emoji
  const getDimensionEmoji = (s: number) => (s >= 75 ? '✅' : s >= 50 ? '⚠️' : '❌');

  const report = `# AFK Viability Analysis

**Score: ${score}/100** ${statusEmoji} ${statusText}

## Dimensions

${getDimensionEmoji(clarity)} Clarity: ${clarity}/100 (${getQualityLabel(clarity)})
   → ${clarity >= 75 ? '✓ Explicit acceptance criteria' : clarity >= 50 ? '~ Some criteria present' : '✗ Missing or vague criteria'}

${getDimensionEmoji(scope)} Scope: ${scope}/100 (${getQualityLabel(scope)})
   → ${scope >= 75 ? '✓ Limited to 1-2 files' : scope >= 50 ? '~ 3-4 files or cross-layer' : '✗ Too broad or architectural'}

${getDimensionEmoji(precedent)} Precedent: ${precedent}/100 (${getQualityLabel(precedent)})
   → ${precedent >= 75 ? '✓ Similar pattern exists' : precedent >= 50 ? '~ Related pattern exists' : '✗ Unique pattern'}

${getDimensionEmoji(coverage)} Coverage: ${coverage}/100 (${getQualityLabel(coverage)})
   → ${coverage >= 75 ? '✓ >80% coverage' : coverage > 0 ? `~ ${coverage}% coverage` : '✗ Coverage unknown'}

${getDimensionEmoji(dependency)} Dependencies: ${dependency}/100 (${getQualityLabel(dependency)})
   → ${dependency >= 100 ? '✓ Self-contained' : '✗ External dependencies detected'}

---

## Recommendation

**Mode: ${statusText}**

${
  score >= 70
    ? `→ Run: \`/auto-devtronic <issue> --afk --max-retries 5\``
    : score >= 40
      ? `→ Run: \`/auto-devtronic <issue> --hitl\` (with human gates)`
      : `→ Refine and re-validate with \`/validate-task-afk --refine\``
}

---

## Gaps Found

${
  gaps.length === 0
    ? 'None — ready to proceed!'
    : gaps
        .map(
          (gap, idx) => `### Gap ${idx + 1}: ${gap.type}
**Issue**: ${gap.message}
**Suggestion**: ${gap.suggestion}`
        )
        .join('\n\n')
}`;

  return report;
}

// ============================================================================
// HELPERS
// ============================================================================

function getQualityLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}
