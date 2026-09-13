import { spawn } from 'node:child_process';

const children = ['@canvas/api', '@canvas/web'].map((name) =>
  spawn('npm', ['run', 'dev', '-w', name], { stdio: 'inherit' }),
);

let stopping = false;

function stop(code = 0) {
  if (stopping) return;

  stopping = true;

  for (const child of children) child.kill('SIGTERM');

  process.exitCode = code;
}

for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code ?? 0));
}

process.on('SIGINT', () => stop());

process.on('SIGTERM', () => stop());
