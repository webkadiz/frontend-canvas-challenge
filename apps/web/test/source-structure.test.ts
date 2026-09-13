import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('keeps JSX children and attributes compact without blank separator lines', () => {
  const violations = inspectSources((node) => {
    const source = node.getSourceFile();

    const hasBlankLine = (start: number, end: number) =>
      /\r?\n[\t ]*\r?\n/.test(source.text.slice(start, end));

    if (ts.isJsxText(node)) return hasBlankLine(node.pos, node.end);
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return false;

    let previous = node.tagName.end;

    for (const attribute of node.attributes.properties) {
      if (hasBlankLine(previous, attribute.getStart(source))) return true;
      previous = attribute.end;
    }

    return hasBlankLine(previous, node.end);
  }, true);

  expect(violations).toEqual([]);
});

it('uses UI buttons and keeps the UI layer independent of application state', () => {
  const violations = inspectSources((node) => {
    const inUi = node.getSourceFile().fileName.includes('/components/ui/');

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      return node.tagName.getText() === 'button' && !inUi;

    if (!inUi || !ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier))
      return false;

    return /(?:model|api|constants|router|App\.module)/.test(node.moduleSpecifier.text);
  }, true);

  expect(violations).toEqual([]);
});

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

function inspectSources(check: (node: ts.Node) => boolean, includeConstants = false) {
  const violations: string[] = [];

  function inspect(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (includeConstants || entry.name !== 'constants') inspect(file);
        continue;
      }
      if (!/\.tsx?$/.test(file)) continue;

      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node: ts.Node) {
        if (check(node)) {
          const { line } = source.getLineAndCharacterOf(node.getStart(source));
          violations.push(`${path.relative(sourceRoot, file)}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }

  inspect(sourceRoot);
  return violations;
}

it('keeps local types with their implementation and shared types in area-level types.ts files', () => {
  const violations = inspectSources(
    (node) => ts.isSourceFile(node) && node.fileName.endsWith('.types.ts'),
    true,
  );

  expect(violations).toEqual([]);
});

it('uses template literals instead of concatenating string literals', () => {
  const violations = inspectSources(
    (node) =>
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      (ts.isStringLiteralLike(node.left) || ts.isStringLiteralLike(node.right)),
    true,
  );

  expect(violations).toEqual([]);
});

it('uses named callbacks instead of inline functions in JSX attributes', () => {
  const violations = inspectSources((node) => {
    if (!ts.isJsxAttribute(node) || !node.initializer || !ts.isJsxExpression(node.initializer))
      return false;

    const expression = node.initializer.expression;

    return !!expression && (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression));
  });

  expect(violations).toEqual([]);
});

it('keeps Russian interface copy in constants, including errors and accessibility labels', () => {
  const violations = inspectSources(
    (node) =>
      (ts.isStringLiteralLike(node) ||
        ts.isJsxText(node) ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail) &&
      /[А-Яа-яЁё]/.test((node as ts.StringLiteralLike).text),
  );
  expect(violations).toEqual([]);
});

it('does not map inline configuration arrays inside JSX', () => {
  const violations = inspectSources((node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.name.text !== 'map'
    )
      return false;
    let target = node.expression.expression;
    while (
      ts.isParenthesizedExpression(target) ||
      ts.isAsExpression(target) ||
      ts.isSatisfiesExpression(target)
    )
      target = target.expression;
    if (!ts.isArrayLiteralExpression(target)) return false;
    let parent: ts.Node | undefined = node.parent;
    while (parent) {
      if (ts.isJsxExpression(parent)) return true;
      parent = parent.parent;
    }
    return false;
  });
  expect(violations).toEqual([]);
});
