import { ESLint } from 'eslint';

export interface EslintIssue {
  ruleId: string | null;
  severity: number; // 1 warning, 2 error
  message: string;
  line: number;
  column: number;
}

let eslintInstance: ESLint | null = null;

async function getInstance() {
  if (!eslintInstance) {
    eslintInstance = new ESLint({
      baseConfig: {
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        env: { es2022: true, node: true, browser: true },
        rules: {
          'no-eval': 'warn',
            'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
            eqeqeq: ['warn', 'always'],
            'no-console': 'off',
        },
      } as any,
    });
  }
  return eslintInstance;
}

export async function runEslintOnCode(code: string, filePath = 'input.js'): Promise<EslintIssue[]> {
  try {
    const eslint = await getInstance();
    const results = await eslint.lintText(code, { filePath });
    const issues: EslintIssue[] = [];
    for (const r of results) {
      for (const m of r.messages) {
        issues.push({
          ruleId: m.ruleId || null,
            severity: m.severity,
            message: m.message,
            line: m.line,
            column: m.column,
        });
      }
    }
    return issues;
  } catch (err) {
    console.error('Falha ao executar ESLint', err);
    return [];
  }
}