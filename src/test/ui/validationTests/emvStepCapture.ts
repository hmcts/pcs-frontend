/** When active, `performAction` / `performValidation` append human-readable lines for EMV auto-reports. */
let active = false;
const lines: string[] = [];

export function startEmvStepCapture(): void {
  active = true;
  lines.length = 0;
}

export function stopEmvStepCapture(): string[] {
  active = false;
  return lines.slice();
}

export function appendEmvStepCaptureLine(line: string): void {
  if (active) {
    lines.push(line);
  }
}
