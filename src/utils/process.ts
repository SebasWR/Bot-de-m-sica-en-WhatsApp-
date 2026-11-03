import { spawn } from 'node:child_process';

export interface RunResult {
  stdout: string;
  stderr: string;
}

/**
 * Ejecuta un binario externo (yt-dlp, ffmpeg) sin shell, para evitar inyección
 * de comandos con el texto que escriben los usuarios.
 */
export function run(command: string, args: string[], timeoutMs = 120_000): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} tardó más de ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`No se pudo ejecutar ${command}: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} terminó con código ${code}: ${stderr.trim().slice(-500)}`));
    });
  });
}
