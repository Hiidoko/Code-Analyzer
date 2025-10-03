// Teste unitário focado apenas em pipeline de análise JS + ESLint
import { analyzeByType } from '../analyzers';
import { buildSections } from '../utils/summaryBuilder';

// Em vez de importar server.ts diretamente (que chama listen), criamos uma instância leve só para testes.
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { runEslintOnCode } from '../utils/eslintRunner';

// Simplified test to ensure ESLint runner works and summary includes sections.

describe('JavaScript analysis + ESLint', () => {
  it('analyzes JS code and returns eslint problems when present', async () => {
    const code = 'var a = 1;\nfunction x(){ eval(\"alert(1)\") }\n';
    const analysis = analyzeByType('js', code);
    const eslintIssues = await runEslintOnCode(code, 'test.js');
    (analysis.result as any).eslintProblems = eslintIssues;
    const { sections } = buildSections('js', analysis.result as any);
    const hasEvalSection = sections.some(s => s.id === 'js-eval');
    const hasEslint = sections.some(s => s.id.startsWith('js-eslint'));
    expect(hasEvalSection).toBe(true);
    expect(hasEslint).toBe(true);
  });
});
