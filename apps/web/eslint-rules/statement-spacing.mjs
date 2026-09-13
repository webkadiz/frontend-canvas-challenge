/** Отличает функцию от обычного значения, включая стандартные обёртки React. */
const isFunctionValue = (node) => {
  if (!node) return false;
  if (['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) return true;
  if (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(node.type))
    return isFunctionValue(node.expression);
  if (node.type !== 'CallExpression') return false;

  const name = node.callee.name ?? node.callee.property?.name;

  return ['memo', 'forwardRef', 'useCallback'].includes(name) && isFunctionValue(node.arguments[0]);
};

/** Получает объявление переменной, в том числе экспортируемой. */
const getVariable = (node) => {
  const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;

  return declaration?.type === 'VariableDeclaration' && ['const', 'let'].includes(declaration.kind)
    ? declaration
    : null;
};

/** Отделяет функции и многострочные объявления, сохраняя компактность простых констант. */
export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: {
      separate: 'Отделяйте объявления функций и многострочные константы пустой строкой.',
      compact: 'Объединяйте соседние однострочные константы без пустых строк.',
    },
  },
  create(context) {
    const source = context.sourceCode;

    const inspect = (statements) => {
      for (let index = 1; index < statements.length; index += 1) {
        const previous = statements[index - 1];
        const next = statements[index];
        const left = getVariable(previous);
        const right = getVariable(next);

        const hasFunction = [left, right].some((declaration) =>
          declaration?.declarations.some((item) => isFunctionValue(item.init)),
        );

        const bothVariables = left && right;

        if (!hasFunction && !bothVariables) continue;

        const bothSingleLine =
          previous.loc.start.line === previous.loc.end.line &&
          next.loc.start.line === next.loc.end.line;

        const needsBlank = hasFunction || !bothSingleLine;

        const comments = source
          .getCommentsBefore(next)
          .filter((comment) => comment.range[0] >= previous.range[1]);

        const trailingComment = comments
          .filter((comment) => comment.loc.start.line === previous.loc.end.line)
          .at(-1);

        const leadingComment = comments.find(
          (comment) => comment.loc.start.line > previous.loc.end.line,
        );

        const boundary = leadingComment ?? next;
        const range = [(trailingComment ?? previous).range[1], boundary.range[0]];
        const gap = source.text.slice(...range);

        // Не перемещает и не удаляет комментарии на строке предыдущего выражения.
        if (gap.trim()) continue;

        const hasBlank = /\r?\n[\t ]*\r?\n/.test(gap);

        if (needsBlank === hasBlank) continue;

        context.report({
          node: next,
          messageId: needsBlank ? 'separate' : 'compact',
          fix: (fixer) => {
            const indentation = gap.slice(gap.lastIndexOf('\n') + 1);
            const newline = source.text.includes('\r\n') ? '\r\n' : '\n';

            return fixer.replaceTextRange(
              range,
              `${newline.repeat(needsBlank ? 2 : 1)}${indentation}`,
            );
          },
        });
      }
    };

    return {
      Program: (node) => inspect(node.body),
      BlockStatement: (node) => inspect(node.body),
      SwitchCase: (node) => inspect(node.consequent),
    };
  },
};
