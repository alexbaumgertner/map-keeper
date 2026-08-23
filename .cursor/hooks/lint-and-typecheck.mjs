#!/usr/bin/env node
/**
 * After agent file edits: lint the file and typecheck its package.
 * On agent stop: typecheck edited packages and follow up if compile errors remain.
 * Always fail-open (exit 0). Logs go to stderr; stdout is JSON only.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_PATH = /(?:^|\/)(?:\.cursor|node_modules|\.next|dist|build|coverage)(?:\/|$)/;
const ESLINT_CONFIGS = [
  'eslint.config.mjs',
  'eslint.config.js',
  'eslint.config.cjs',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
];
const TYPECHECK_DEBOUNCE_MS = 15_000;
const MAX_OUTPUT = 8_000;

function reply(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}

function truncate(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed.length <= MAX_OUTPUT) return trimmed;
  return `${trimmed.slice(0, MAX_OUTPUT)}\n… (truncated)`;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function findRepoRoot(start, workspaceRoots) {
  if (Array.isArray(workspaceRoots) && workspaceRoots[0] && existsSync(workspaceRoots[0])) {
    return workspaceRoots[0];
  }
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.cursor'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

function isWorkspacePackageDir(dir, repoRoot) {
  const rel = relative(repoRoot, dir).split(sep);
  return rel.length === 2 && (rel[0] === 'apps' || rel[0] === 'packages');
}

function findPackage(filePath, repoRoot) {
  let dir = dirname(filePath);
  const rootPrefix = repoRoot.endsWith(sep) ? repoRoot : repoRoot + sep;
  while (dir === repoRoot || dir.startsWith(rootPrefix)) {
    const pkgPath = join(dir, 'package.json');
    if (isWorkspacePackageDir(dir, repoRoot) && existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts?.typecheck || ESLINT_CONFIGS.some((f) => existsSync(join(dir, f)))) {
          return { dir, pkg };
        }
      } catch {
        // keep walking
      }
    }
    if (dir === repoRoot) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function statePath(conversationId) {
  const dir = join(tmpdir(), 'map-keeper-cursor-hooks');
  mkdirSync(dir, { recursive: true });
  const safe = String(conversationId || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
  return join(dir, `${safe}.json`);
}

function loadState(conversationId) {
  const path = statePath(conversationId);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { edited: [], packages: [], errors: '', lastTypecheckAt: 0 };
  }
}

function saveState(conversationId, state) {
  writeFileSync(statePath(conversationId), JSON.stringify(state));
}

function clearState(conversationId) {
  try {
    unlinkSync(statePath(conversationId));
  } catch {
    // ignore
  }
}

function run(cmd, args, cwd, timeoutMs) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
  });
}

function lintFile(pkgDir, filePath) {
  if (!ESLINT_CONFIGS.some((f) => existsSync(join(pkgDir, f)))) {
    return { ok: true, output: '' };
  }
  const rel = relative(pkgDir, filePath) || filePath;
  const result = run('pnpm', ['exec', 'eslint', rel], pkgDir, 25_000);
  if (result.error?.code === 'ENOENT') {
    return { ok: true, output: '' };
  }
  const output = truncate(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return { ok: result.status === 0, output };
}

function typecheckPackage(pkgDir) {
  const pkgPath = join(pkgDir, 'package.json');
  if (!existsSync(pkgPath)) return { ok: true, output: '' };
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return { ok: true, output: '' };
  }
  if (!pkg.scripts?.typecheck) return { ok: true, output: '' };
  const result = run('pnpm', ['run', 'typecheck'], pkgDir, 80_000);
  if (result.error?.code === 'ENOENT') {
    return { ok: false, output: 'pnpm is not on PATH; cannot typecheck.' };
  }
  const output = truncate(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return { ok: result.status === 0, output };
}

function formatReport({ fileRel, lint, typecheck }) {
  const parts = [];
  if (lint && !lint.ok) {
    parts.push(`ESLint failed:\n${lint.output || '(no output)'}`);
  }
  if (typecheck && !typecheck.ok) {
    parts.push(`Typecheck failed (tsc --noEmit). Fix these before finishing — they fail next build:\n${typecheck.output || '(no output)'}`);
  }
  if (parts.length === 0) return '';
  return [
    'Lint/typecheck hook found problems. Fix them before considering the task done.',
    fileRel ? `Edited: ${fileRel}` : null,
    ...parts,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function handleAfterFileEdit(payload) {
  const filePath = payload.file_path;
  if (!filePath || !CODE_EXT.test(filePath) || SKIP_PATH.test(filePath.replaceAll('\\', '/'))) {
    reply({});
  }

  const repoRoot = findRepoRoot(filePath, payload.workspace_roots);
  const fileRel = relative(repoRoot, filePath).split(sep).join('/');
  const pkg = findPackage(filePath, repoRoot);
  const conversationId = payload.conversation_id || payload.session_id;
  const state = loadState(conversationId);

  if (!state.edited.includes(fileRel)) state.edited.push(fileRel);
  if (pkg) {
    const pkgRel = relative(repoRoot, pkg.dir).split(sep).join('/') || '.';
    if (!state.packages.includes(pkgRel)) state.packages.push(pkgRel);
  }

  const lint = pkg ? lintFile(pkg.dir, filePath) : { ok: true, output: '' };
  const now = Date.now();
  const skipTypecheck = Boolean(pkg) && now - (state.lastTypecheckAt || 0) < TYPECHECK_DEBOUNCE_MS;
  const typecheck = pkg && !skipTypecheck ? typecheckPackage(pkg.dir) : null;
  if (pkg && !skipTypecheck) state.lastTypecheckAt = now;

  const report = formatReport({ fileRel, lint, typecheck });
  if (report) state.errors = report;
  else if (!skipTypecheck) state.errors = '';
  saveState(conversationId, state);

  if (!state.errors) {
    reply({});
  }

  reply({
    additional_context: state.errors,
  });
}

function handlePostToolUse(payload) {
  const conversationId = payload.conversation_id || payload.session_id;
  const state = loadState(conversationId);
  if (!state.errors) {
    reply({});
  }
  reply({ additional_context: state.errors });
}

function handleStop(payload) {
  if (payload.status && payload.status !== 'completed') {
    reply({});
  }

  const conversationId = payload.conversation_id || payload.session_id;
  const state = loadState(conversationId);
  const edited = (state.edited || []).filter(
    (f) => CODE_EXT.test(f) && !SKIP_PATH.test(String(f).replaceAll('\\', '/')),
  );
  if (!edited.length) {
    clearState(conversationId);
    reply({});
  }

  const repoRoot = findRepoRoot(process.cwd(), payload.workspace_roots);
  const failures = [];
  const pkgDirs = (state.packages || [])
    .filter((p) => p && p !== '.')
    .map((p) => join(repoRoot, p))
    .filter((dir) => isWorkspacePackageDir(dir, repoRoot));

  for (const dir of pkgDirs) {
    const result = typecheckPackage(dir);
    if (!result.ok) {
      const label = relative(repoRoot, dir) || '.';
      failures.push(`${label}:\n${result.output || '(no output)'}`);
    }
  }

  if (failures.length === 0) {
    clearState(conversationId);
    reply({});
  }

  const body = failures.join('\n\n');
  saveState(conversationId, { ...state, errors: body, lastTypecheckAt: Date.now() });
  reply({
    followup_message:
      `Typecheck failed after your edits. These errors fail \`next build\` / Vercel. Fix them, then stop.\n\n${body}`,
  });
}

try {
  const raw = readStdin().trim();
  const payload = raw ? JSON.parse(raw) : {};
  const event = payload.hook_event_name || payload.event || '';

  if (event === 'stop' || (payload.status && !payload.file_path)) {
    handleStop(payload);
  } else if (event === 'postToolUse' || payload.tool_name) {
    handlePostToolUse(payload);
  } else {
    handleAfterFileEdit(payload);
  }
} catch (err) {
  process.stderr.write(`[lint-and-typecheck] ${err instanceof Error ? err.message : err}\n`);
  reply({});
}
