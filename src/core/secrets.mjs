const SECRET_PATTERNS = [
  { name: 'Stripe Live Key', regex: /sk_live_[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe Restricted Key', regex: /rk_live_[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe Test Key', regex: /sk_test_[a-zA-Z0-9]{20,}/ },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /gh[ps]_[a-zA-Z0-9]{36,}/ },
  { name: 'GitHub PAT', regex: /github_pat_[a-zA-Z0-9_]{20,}/ },
  { name: 'Google OAuth Secret', regex: /GOCSPX-[a-zA-Z0-9_-]{20,}/ },
  { name: 'Cloudflare Turnstile', regex: /0x4[a-zA-Z0-9]{21,}/ },
  { name: 'Supabase Service Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{50,}/ },
  { name: 'Generic API Key Assignment', regex: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9_\-/.]{16,}["']/i },
  { name: 'Hardcoded Password', regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{6,}["']/i },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Slack Token', regex: /xox[bpors]-[a-zA-Z0-9-]{10,}/ },
  { name: 'SendGrid Key', regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/ },
  { name: 'Twilio Key', regex: /SK[a-f0-9]{32}/ },
];

const IGNORE_PATTERNS = [
  /\.env(\.local|\.example|\.sample|\.template)?$/,
  /\.test\.(ts|tsx|js|jsx|mjs)$/,
  /\.spec\.(ts|tsx|js|jsx|mjs)$/,
  /node_modules/,
  /\.git\//,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /\.drykit\//,
  /\.md$/,
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(p => p.test(filePath));
}

export function scanFileForSecrets(content, filePath) {
  if (shouldIgnoreFile(filePath)) return [];

  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    if (trimmed.includes('process.env.') || trimmed.includes('import.meta.env.')) continue;

    for (const pattern of SECRET_PATTERNS) {
      const match = line.match(pattern.regex);
      if (match) {
        const value = match[0];
        const masked = value.slice(0, 8) + '...' + value.slice(-4);
        findings.push({
          file: filePath,
          line: i + 1,
          type: pattern.name,
          masked,
          suggestion: `Move to .env.local and reference as process.env.${guessEnvName(pattern.name)}`,
        });
        break;
      }
    }
  }

  return findings;
}

function guessEnvName(patternName) {
  const map = {
    'Stripe Live Key': 'STRIPE_SECRET_KEY',
    'Stripe Restricted Key': 'STRIPE_RESTRICTED_KEY',
    'Stripe Test Key': 'STRIPE_SECRET_KEY',
    'AWS Access Key': 'AWS_ACCESS_KEY_ID',
    'GitHub Token': 'GITHUB_TOKEN',
    'GitHub PAT': 'GITHUB_TOKEN',
    'Google OAuth Secret': 'GOOGLE_CLIENT_SECRET',
    'Cloudflare Turnstile': 'TURNSTILE_SECRET_KEY',
    'Supabase Service Key': 'SUPABASE_SERVICE_ROLE_KEY',
    'Slack Token': 'SLACK_TOKEN',
    'SendGrid Key': 'SENDGRID_API_KEY',
    'Twilio Key': 'TWILIO_API_KEY',
  };
  return map[patternName] || 'YOUR_SECRET';
}

export function findSecrets(fileContents) {
  const allFindings = [];
  for (const { path, content } of fileContents) {
    const findings = scanFileForSecrets(content, path);
    allFindings.push(...findings);
  }
  return allFindings;
}
