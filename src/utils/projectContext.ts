import * as vscode from 'vscode';
import * as path from 'path';
import { Buffer } from 'buffer';

const MAX_CONTEXT_FILES = 5;
const MAX_EXPORTED_LINES = 60;

function parseLocalImportPaths(content: string): string[] {
  const paths: string[] = [];
  const re = /(?:from|require)\s*\(?['"](\.{1,2}[^'"]*)['"]\)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

async function resolveImportUri(
  importPath: string,
  dirUri: vscode.Uri
): Promise<vscode.Uri | null> {
  const candidates = [
    importPath,
    importPath + '.ts',
    importPath + '.tsx',
    importPath + '.js',
    importPath + '.jsx',
    importPath + '/index.ts',
    importPath + '/index.tsx',
    importPath + '/index.js',
  ];
  for (const candidate of candidates) {
    const uri = vscode.Uri.joinPath(dirUri, candidate);
    try {
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
    }
  }
  return null;
}

function extractExportedSignatures(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length && result.length < MAX_EXPORTED_LINES) {
    const line = lines[i];

    if (!line.startsWith('export ')) {
      i++;
      continue;
    }

    result.push(line);

    if (/^export\s+(interface|type|enum)\s/.test(line) && line.includes('{') && !line.includes('}')) {
      let depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      while (++i < lines.length && depth > 0 && result.length < MAX_EXPORTED_LINES) {
        result.push(lines[i]);
        depth += (lines[i].match(/\{/g) ?? []).length;
        depth -= (lines[i].match(/\}/g) ?? []).length;
      }
    }
    i++;
  }

  return result.join('\n');
}

/**
 * Builds a concise "project context" string by walking the current file's
 * local imports, reading each resolved file, and extracting its exported
 * type definitions and function signatures.
 *
 * This gives the AI precise knowledge of the types the current file depends on
 * without flooding the prompt with implementation details.
 */
export async function buildProjectContext(document: vscode.TextDocument): Promise<string> {
  const content = document.getText();
  const dirUri = vscode.Uri.file(path.dirname(document.uri.fsPath));

  const importPaths = parseLocalImportPaths(content);
  const seen = new Set<string>();
  const contextParts: string[] = [];

  for (const importPath of importPaths) {
    if (contextParts.length >= MAX_CONTEXT_FILES) { break; }

    const resolvedUri = await resolveImportUri(importPath, dirUri);
    if (!resolvedUri) { continue; }

    const key = resolvedUri.toString();
    if (seen.has(key) || key === document.uri.toString()) { continue; }
    seen.add(key);

    try {
      const raw = await vscode.workspace.fs.readFile(resolvedUri);
      const source = Buffer.from(raw).toString('utf-8');
      const signatures = extractExportedSignatures(source);
      if (signatures.trim()) {
        const relPath = path.relative(path.dirname(document.uri.fsPath), resolvedUri.fsPath);
        contextParts.push(`// ${relPath}\n${signatures}`);
      }
    } catch {
    }
  }

  return contextParts.join('\n\n');
}
