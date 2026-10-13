/** Bounded lexical guard: JSON serialization is not a semantic identity.
 * ESLint owns parsing and scopes; consumers retain permutation regression tests.
 */
const EQUALITY = new Set(["==", "!=", "===", "!=="]);
const ASSERTIONS = new Set([
  "equal",
  "notEqual",
  "strictEqual",
  "notStrictEqual",
  "deepEqual",
  "notDeepEqual",
  "deepStrictEqual",
  "notDeepStrictEqual",
]);
const MATCHERS = new Set(["toBe", "toEqual", "toStrictEqual"]);
const ROOT_ROLES = new Map([
  ["JSON", "json"],
  ["Object", "object"],
  ["Set", "set-constructor"],
  ["Map", "map-constructor"],
  ["Buffer", "buffer"],
  ["expect", "expect"],
  ["String", "string"],
  ["globalThis", "global"],
  ["global", "global"],
  ["window", "global"],
]);
const INSTANCE_ROLES = new Map([
  ["set-constructor", "set"],
  ["map-constructor", "map"],
]);
const CONTRACT =
  /^json-identity-contract: (bytes|digest|ordered-tuple); owner: ([^;\r\n]+); reason: (\S[^\r\n]*)$/u;

function propertyName(node) {
  if (!node.computed && node.property?.type === "Identifier")
    return node.property.name;
  if (node.property?.type === "Literal") return String(node.property.value);
  return null;
}

function bindingPath(pattern, target, path = []) {
  if (pattern === target) return path;
  if (pattern?.type === "AssignmentPattern")
    return bindingPath(pattern.left, target, path);
  if (pattern?.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type !== "Property" || property.computed) continue;
      const found = bindingPath(property.value, target, [
        ...path,
        property.key.name ?? String(property.key.value),
      ]);
      if (found) return found;
    }
  }
  if (pattern?.type === "ArrayPattern") {
    for (const [index, element] of pattern.elements.entries()) {
      const found = bindingPath(element, target, [...path, String(index)]);
      if (found) return found;
    }
  }
  return null;
}

function selectedValue(node, path) {
  if (!path.length) return node;
  if (node?.type === "ObjectExpression") {
    const property = node.properties.find(
      (candidate) =>
        candidate.type === "Property" &&
        !candidate.computed &&
        (candidate.key.name ?? String(candidate.key.value)) === path[0],
    );
    return selectedValue(property?.value, path.slice(1));
  }
  if (node?.type === "ArrayExpression")
    return selectedValue(node.elements[Number(path[0])], path.slice(1));
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject raw JSON serialization used as equality or identity.",
    },
    schema: [],
    messages: {
      identity:
        "JSON.stringify is order-sensitive. Compare structured data or use a reviewed canonical identity; declare an intentional byte/digest/ordered-tuple contract locally.",
      contract:
        "Use one immediately preceding line: json-identity-contract: bytes|digest|ordered-tuple; owner: OWNER; reason: REASON.",
      unused:
        "Unused JSON identity contract: attach it immediately before the serializer used by an identity operation.",
      analysisLimit:
        "JSON identity analysis exceeded 64 lexical frames or 100000 steps; simplify the local alias graph so the guard can complete.",
    },
  },
  create(context) {
    const source = context.sourceCode;
    const contracts = source
      .getAllComments()
      .filter((comment) =>
        comment.value.trim().startsWith("json-identity-contract:"),
      );
    const used = new Set();
    const reported = new Set();
    const sinks = [];
    // Prune impossible flows from native scope facts, rather than exempting
    // generated files. Escaped identifiers have their decoded binding names.
    const roots = new Set(["JSON", "globalThis", "global", "window"]);
    const maySerialize = source.scopeManager.scopes.some(
      (scope) =>
        scope.through.some((reference) =>
          roots.has(reference.identifier.name),
        ) ||
        scope.variables.some(
          (bound) =>
            roots.has(bound.name) &&
            !bound.defs.length &&
            bound.references.length,
        ),
    );
    let remainingAnalysisSteps = 100_000;
    let analysisLimited = false;

    function withinBudget(seen) {
      if (seen.size >= 64 || --remainingAnalysisSteps < 0) {
        analysisLimited = true;
        return false;
      }
      return true;
    }

    function variable(node) {
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        if (scope.set.has(node.name)) return scope.set.get(node.name);
      }
      return null;
    }

    function values(node) {
      const bound = variable(node);
      if (!bound) return [];
      const entries = [];
      for (const definition of bound.defs) {
        if (definition.type === "Variable" && definition.node.init) {
          entries.push({
            node: definition.node.init,
            path: bindingPath(definition.node.id, definition.name) ?? [],
          });
        }
      }
      for (const reference of bound.references) {
        if (reference.isWrite() && reference.writeExpr && !reference.init) {
          let parent = reference.identifier.parent;
          while (
            parent &&
            ![
              "AssignmentExpression",
              "VariableDeclarator",
              "FunctionDeclaration",
              "FunctionExpression",
              "ArrowFunctionExpression",
            ].includes(parent.type)
          )
            parent = parent.parent;
          entries.push({
            node: reference.writeExpr,
            path:
              parent?.type === "AssignmentExpression"
                ? (bindingPath(parent.left, reference.identifier) ?? [])
                : [],
          });
        }
      }
      return entries;
    }

    function projectedValues(node, path, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      if (!path.length) return [node];
      seen = new Set(seen).add(node);
      const selected = selectedValue(node, [path[0]]);
      if (selected) return projectedValues(selected, path.slice(1), seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, [...entry.path, ...path], seen),
        );
      if (node.type === "MemberExpression" && propertyName(node) !== null)
        return projectedValues(
          node.object,
          [propertyName(node), ...path],
          seen,
        );
      return [];
    }

    function rolesAt(node, path, seen) {
      if (!path.length) return roles(node, seen);
      const selected = projectedValues(node, [path[0]], seen);
      if (selected.length)
        return selected.flatMap((value) => rolesAt(value, path.slice(1), seen));
      return path.reduce(
        (current, name) =>
          current.map((role) => memberRole(role, name)).filter(Boolean),
        roles(node, seen),
      );
    }

    function memberRole(role, name) {
      if (
        ["stringify", "compare", "expect", "matcher", "hash-factory"].includes(
          role,
        ) &&
        name === "bind"
      )
        return `${role}-bound`;
      if (role === "global") return ROOT_ROLES.get(name) ?? null;
      if (role === "buffer-module" && name === "Buffer") return "buffer";
      if (role === "json" && name === "stringify") return "stringify";
      if (role === "object" && name === "is") return "compare";
      if (role === "assert" && ASSERTIONS.has(name)) return "compare";
      if (role === "assert" && name === "strict") return "assert";
      if (role === "buffer" && name === "from") return "buffer-from";
      if (role === "crypto" && ["createHash", "createHmac"].includes(name))
        return "hash-factory";
      if (role === "stringify" && ["call", "apply"].includes(name))
        return "stringify";
      if (
        role === "expect-result" &&
        ["not", "resolves", "rejects"].includes(name)
      )
        return role;
      if (role === "expect-result" && MATCHERS.has(name)) return "matcher";
      return null;
    }

    function roles(node, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression") return roles(node.expression, seen);
      if (node.type === "Identifier") {
        const bound = variable(node);
        if (!bound?.defs.length) {
          const role = ROOT_ROLES.get(node.name);
          return role ? [role] : [];
        }
        const imported = bound.defs.find(
          (definition) => definition.type === "ImportBinding",
        );
        if (imported) {
          const from = imported.parent.source.value;
          const name = imported.node.imported?.name;
          if (["@jest/globals", "vitest"].includes(from) && name === "expect")
            return ["expect"];
          if (/^(?:node:)?buffer$/u.test(from))
            return name === "Buffer"
              ? ["buffer"]
              : imported.node.type === "ImportSpecifier"
                ? []
                : ["buffer-module"];
          if (/^(?:node:)?assert(?:\/strict)?$/u.test(from))
            return name && ASSERTIONS.has(name) ? ["compare"] : ["assert"];
          if (/^(?:node:)?crypto$/u.test(from))
            return ["createHash", "createHmac"].includes(name)
              ? ["hash-factory"]
              : ["crypto"];
          return [];
        }
        return values(node).flatMap((entry) =>
          rolesAt(entry.node, entry.path, seen),
        );
      }
      if (node.type === "MemberExpression")
        return rolesAt(node.object, [propertyName(node)], seen);
      if (node.type === "ArrayExpression") return ["array"];
      if (node.type === "NewExpression")
        return roles(node.callee, seen)
          .map((role) => INSTANCE_ROLES.get(role))
          .filter(Boolean);
      if (node.type === "CallExpression") {
        const called = roles(node.callee, seen);
        const boundRole = called.find((role) => role.endsWith("-bound"));
        if (boundRole) return [boundRole.slice(0, -6)];
        if (called.includes("expect")) return ["expect-result"];
        if (called.includes("hash-factory")) return ["hash"];
        if (
          node.callee.type === "MemberExpression" &&
          propertyName(node.callee) === "update" &&
          roles(node.callee.object, seen).includes("hash")
        )
          return ["hash"];
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          !variable(node.callee)?.defs.length
        ) {
          const from = node.arguments[0]?.value;
          if (
            typeof from === "string" &&
            /^(?:node:)?assert(?:\/strict)?$/u.test(from)
          )
            return ["assert"];
          if (typeof from === "string" && /^(?:node:)?crypto$/u.test(from))
            return ["crypto"];
          if (typeof from === "string" && /^(?:node:)?buffer$/u.test(from))
            return ["buffer-module"];
        }
      }
      return [];
    }

    function origins(node, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression")
        return origins(node.expression, seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, entry.path, seen).flatMap((value) =>
            origins(value, seen),
          ),
        );
      if (node.type === "MemberExpression" && propertyName(node) !== null)
        return projectedValues(node.object, [propertyName(node)], seen).flatMap(
          (value) => origins(value, seen),
        );
      if (node.type === "CallExpression") {
        const called = roles(node.callee);
        if (called.includes("stringify")) return [node];
        if (called.includes("buffer-from") || called.includes("string"))
          return origins(node.arguments[0], seen);
        if (
          node.callee.type === "MemberExpression" &&
          [
            "toString",
            "trim",
            "trimStart",
            "trimEnd",
            "normalize",
            "replace",
            "replaceAll",
          ].includes(propertyName(node.callee))
        )
          return origins(node.callee.object, seen);
      }
      if (node.type === "TemplateLiteral")
        return node.expressions.flatMap((expression) =>
          origins(expression, seen),
        );
      if (node.type === "BinaryExpression" && node.operator === "+")
        return [...origins(node.left, seen), ...origins(node.right, seen)];
      if (node.type === "LogicalExpression")
        return [...origins(node.left, seen), ...origins(node.right, seen)];
      if (node.type === "ConditionalExpression")
        return [
          ...origins(node.consequent, seen),
          ...origins(node.alternate, seen),
        ];
      if (node.type === "SequenceExpression")
        return origins(node.expressions.at(-1), seen);
      if (node.type === "AssignmentExpression")
        return origins(node.right, seen);
      if (node.type === "AwaitExpression") return origins(node.argument, seen);
      return [];
    }

    function inspect(node) {
      for (const origin of origins(node)) {
        if (reported.has(origin)) continue;
        reported.add(origin);
        const starts = new Set([origin.loc.start.line]);
        for (let parent = origin.parent; parent; parent = parent.parent) {
          if (
            [
              "VariableDeclaration",
              "ExpressionStatement",
              "ReturnStatement",
              "IfStatement",
            ].includes(parent.type)
          ) {
            starts.add(parent.loc.start.line);
            break;
          }
          if (
            [
              "BlockStatement",
              "ArrowFunctionExpression",
              "FunctionExpression",
              "FunctionDeclaration",
            ].includes(parent.type)
          )
            break;
        }
        const attached = contracts.filter((comment) =>
          starts.has(comment.loc.end.line + 1),
        );
        if (
          attached.length === 1 &&
          attached[0].type === "Line" &&
          !used.has(attached[0]) &&
          !source.lines[attached[0].loc.start.line - 1]
            .slice(0, attached[0].loc.start.column)
            .trim() &&
          CONTRACT.test(attached[0].value.trim()) &&
          CONTRACT.exec(attached[0].value.trim())[2].trim()
        ) {
          used.add(attached[0]);
        } else context.report({ node: origin, messageId: "identity" });
      }
    }

    function expectArguments(node) {
      while (node?.type === "MemberExpression") node = node.object;
      if (
        node?.type === "CallExpression" &&
        roles(node.callee).includes("expect")
      )
        return node.arguments;
      return [];
    }

    function matcherArguments(node, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression")
        return matcherArguments(node.expression, seen);
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        propertyName(node.callee) === "bind"
      )
        return matcherArguments(node.callee.object, seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, entry.path, seen).flatMap((value) =>
            matcherArguments(value, seen),
          ),
        );
      return node.type === "MemberExpression"
        ? expectArguments(node.object)
        : [];
    }

    function collectionElements(node, map, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return;
      seen = new Set(seen).add(node);
      if (node.type === "Identifier") {
        for (const entry of values(node))
          for (const value of projectedValues(entry.node, entry.path, seen))
            collectionElements(value, map, seen);
      } else if (node.type === "ArrayExpression") {
        sinks.push(
          ...node.elements.map((entry) =>
            map ? selectedValue(entry, ["0"]) : entry,
          ),
        );
      } else if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        propertyName(node.callee) === "map"
      ) {
        const callback = node.arguments[0];
        if (
          callback?.type === "ArrowFunctionExpression" &&
          callback.body.type !== "BlockStatement"
        ) {
          sinks.push(map ? selectedValue(callback.body, ["0"]) : callback.body);
        }
      }
    }

    return {
      BinaryExpression(node) {
        if (EQUALITY.has(node.operator)) sinks.push(node.left, node.right);
      },
      MemberExpression(node) {
        if (node.computed) sinks.push(node.property);
      },
      Property(node) {
        if (node.computed) sinks.push(node.key);
      },
      NewExpression(node) {
        if (!maySerialize) return;
        const called = roles(node.callee);
        if (called.includes("set-constructor"))
          collectionElements(node.arguments[0], false);
        if (called.includes("map-constructor"))
          collectionElements(node.arguments[0], true);
      },
      CallExpression(node) {
        if (!maySerialize) return;
        const called = roles(node.callee);
        if (called.includes("compare"))
          sinks.push(...node.arguments.slice(0, 2));
        if (called.includes("matcher"))
          sinks.push(
            ...node.arguments.slice(0, 1),
            ...matcherArguments(node.callee),
          );
        if (node.callee.type !== "MemberExpression") return;
        const receiver = roles(node.callee.object);
        const name = propertyName(node.callee);
        if (
          (receiver.includes("set") &&
            ["add", "has", "delete"].includes(name)) ||
          (receiver.includes("map") &&
            ["set", "get", "has", "delete"].includes(name)) ||
          (receiver.includes("array") &&
            ["includes", "indexOf", "lastIndexOf"].includes(name)) ||
          (receiver.includes("hash") && name === "update")
        )
          sinks.push(node.arguments[0]);
      },
      "Program:exit"(node) {
        if (maySerialize) sinks.forEach(inspect);
        if (analysisLimited)
          context.report({ node, messageId: "analysisLimit" });
        for (const comment of contracts) {
          if (!used.has(comment))
            context.report({
              loc: comment.loc,
              messageId:
                CONTRACT.test(comment.value.trim()) && comment.type === "Line"
                  ? "unused"
                  : "contract",
            });
        }
      },
    };
  },
};
