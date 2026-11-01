/** Check syntax for backend source and enforce short files for the new support module. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
let failed = false;
function check(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(item.name)) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) { check(path); continue; }
    if (!/\.(m?js)$/.test(path)) continue;
    if (readFileSync(path, 'utf8').trimEnd().split('\n').length > 200) { console.error(`Over 200 lines: ${path}`); failed = true; }
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.status) failed = true;
  }
}
check('.'); if (failed) process.exit(1); console.log('Backend syntax and file size checks passed.');
