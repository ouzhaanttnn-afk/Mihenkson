import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

export function gameCenterConfigured(source) {
  const file = ts.createSourceFile('release.ts', source, ts.ScriptTarget.Latest, true);
  let entries;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'MONTHLY_LEADERBOARD_IDS') {
      let value = node.initializer;
      while (value && (ts.isAsExpression(value) || ts.isParenthesizedExpression(value))) value = value.expression;
      if (!value || !ts.isObjectLiteralExpression(value)) throw new Error('Leaderboard IDs must be an explicit month-to-ID object.');
      const identifiers = new Set();
      entries = value.properties.map(property => {
        if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) || !ts.isStringLiteral(property.initializer)) {
          throw new Error('Leaderboard month and ID must be literal strings.');
        }
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(property.name.text) || !property.initializer.text.trim()) {
          throw new Error('Invalid leaderboard month or empty identifier.');
        }
        const identifier = property.initializer.text;
        if (identifier !== identifier.trim() || identifier.length > 100 || !/^[A-Za-z0-9._-]+$/.test(identifier)) {
          throw new Error('Invalid leaderboard identifier.');
        }
        if (identifiers.has(identifier)) throw new Error('Each calendar month needs a different leaderboard ID.');
        identifiers.add(identifier);
        return property.name.text;
      });
      if (new Set(entries).size !== entries.length) throw new Error('Duplicate leaderboard month.');
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!entries) throw new Error('MONTHLY_LEADERBOARD_IDS is missing.');
  return entries.length > 0;
}

export function entitlementPlist(enabled) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
${enabled ? '  <key>com.apple.developer.game-center</key><true/>\n' : ''}</dict></plist>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const enabled = gameCenterConfigured(readFileSync('src/config/release.ts', 'utf8'));
  writeFileSync('ios/App/App/App.entitlements', entitlementPlist(enabled));
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  writeFileSync('public/release.json', JSON.stringify({ version, commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null, gameCenterConfigured: enabled }));
  console.log(`Release ${version}: Game Center ${enabled ? 'configured (matching signing profile required)' : 'dormant; existing signing profile supported'}.`);
}
