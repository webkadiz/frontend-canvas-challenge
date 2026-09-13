import { Linter } from 'eslint';
import { expect, it } from 'vitest';
import statementSpacing from '../eslint-rules/statement-spacing.mjs';

const config = {
  plugins: { local: { rules: { 'statement-spacing': statementSpacing } } },
  rules: { 'local/statement-spacing': 'error' },
};

const cases = [
  {
    name: 'keeps ordinary single-line constants together',
    input: 'const a = 1;\n\nconst b = 2;',
    output: 'const a = 1;\nconst b = 2;',
  },
  {
    name: 'separates two single-line functions',
    input: 'const a = () => 1;\nconst b = () => 2;',
    output: 'const a = () => 1;\n\nconst b = () => 2;',
  },
  {
    name: 'separates a function from values on both sides',
    input: 'const a = 1;\nconst fn = () => a;\nconst b = 2;',
    output: 'const a = 1;\n\nconst fn = () => a;\n\nconst b = 2;',
  },
  {
    name: 'separates a handler from the return statement',
    input: 'const Component = () => {\n  const fn = () => 1;\n  return fn();\n};',
    output: 'const Component = () => {\n  const fn = () => 1;\n\n  return fn();\n};',
  },
  {
    name: 'keeps ordinary hook values compact',
    input: "const [value, setValue] = useState('');\nconst filtered = values.filter(Boolean);",
    output: "const [value, setValue] = useState('');\nconst filtered = values.filter(Boolean);",
  },
  {
    name: 'separates memoized callbacks',
    input: 'const a = 1;\nconst fn = useCallback(() => a, [a]);',
    output: 'const a = 1;\n\nconst fn = useCallback(() => a, [a]);',
  },
  {
    name: 'separates memoized components',
    input: 'const a = 1;\nexport const Component = memo(() => a);',
    output: 'const a = 1;\n\nexport const Component = memo(() => a);',
  },
  {
    name: 'separates forwardRef components',
    input: 'const a = 1;\nconst Component = React.forwardRef(() => a);',
    output: 'const a = 1;\n\nconst Component = React.forwardRef(() => a);',
  },
  {
    name: 'keeps top-level JSDoc attached to the function',
    input: 'const a = 1;\n/** Helper. */\nconst fn = () => a;',
    output: 'const a = 1;\n\n/** Helper. */\nconst fn = () => a;',
  },
  {
    name: 'preserves trailing comments while separating functions',
    input: 'const a = 1; // Value.\nconst fn = () => a;',
    output: 'const a = 1; // Value.\n\nconst fn = () => a;',
  },
  {
    name: 'keeps multiline values separated',
    input: 'const a = [\n  1,\n];\nconst b = 2;',
    output: 'const a = [\n  1,\n];\n\nconst b = 2;',
  },
  {
    name: 'does not add empty lines just inside a block',
    input: 'const fn = () => {\n  const nested = () => 1;\n};',
    output: 'const fn = () => {\n  const nested = () => 1;\n};',
  },
  {
    name: 'preserves CRLF line endings',
    input: 'const a = 1;\r\nconst fn = () => a;',
    output: 'const a = 1;\r\n\r\nconst fn = () => a;',
  },
];

it.each(cases)('$name', ({ input, output }) => {
  const linter = new Linter();
  const result = linter.verifyAndFix(input, config);

  expect(result.output).toBe(output);
  expect(result.messages).toEqual([]);
  expect(linter.verifyAndFix(result.output, config).fixed).toBe(false);
});
