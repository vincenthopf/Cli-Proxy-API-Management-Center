const SECRET_KEY = /(token|secret|password|cookie|api[_-]?key|authorization|private[_-]?key|client[_-]?secret)/i;

const maskValue = (value: string): string =>
  value.length <= 8 ? '••••••' : `${value.slice(0, 4)}••••••${value.slice(-4)}`;

const redact = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(redact);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) && typeof value === 'string' ? maskValue(value) : redact(value);
    }
    return out;
  }
  return input;
};

export const redactJsonText = (text: string): string => {
  if (!text) return '';
  try {
    return JSON.stringify(redact(JSON.parse(text)), null, 2);
  } catch {
    return text;
  }
};

export const redactYamlText = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*-?\s*(?:[\w-]*(?:key|secret|token|password)[\w-]*:\s*)?)(["']?)(.+?)\2\s*$/i);
      if (!m) return line;
      const prefix = m[1];
      const isSecretField = /(key|secret|token|password)[\w-]*:\s*$/i.test(prefix);
      const isListItem = /^\s*-\s*$/.test(prefix);
      if (!isSecretField && !isListItem) return line;
      const value = m[3];
      if (isListItem && !/^(sk-|[A-Za-z0-9_-]{24,}$)/.test(value)) return line;
      if (value.startsWith('$2a$') || value.length < 8) return isSecretField ? `${prefix}"••••••"` : line;
      return `${prefix}${m[2]}${maskValue(value)}${m[2]}`;
    })
    .join('\n');
