/** Recognize the exact DFO process from Windows tasklist /FO CSV. */
export function parseTasklist(stdout) {
  return String(stdout).split(/\r?\n/).some((line) => /^\s*"DFO Online\.exe"\s*,/i.test(line));
}
