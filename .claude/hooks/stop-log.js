const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join('.chat-history', 'log.md');
const SUMMARY_MAX_LEN = 400;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join(' ');
}

function sanitize(value) {
  return String(value).replace(/\s+/g, ' ').replace(/"/g, '\\"').trim();
}

let input = {};
try {
  input = JSON.parse(readStdin() || '{}');
} catch {
  input = {};
}

let lines = [];
if (input.transcript_path && fs.existsSync(input.transcript_path)) {
  lines = fs
    .readFileSync(input.transcript_path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

let lastUserIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].type === 'user') {
    lastUserIdx = i;
    break;
  }
}

let userPrompt = '(no user prompt found in transcript)';
const filesAffected = new Set();
const summaryParts = [];

if (lastUserIdx !== -1) {
  const userMsg = lines[lastUserIdx].message || {};
  userPrompt = textFromContent(userMsg.content) || '(non-text user message)';

  for (let i = lastUserIdx + 1; i < lines.length; i++) {
    const entry = lines[i];
    if (entry.type !== 'assistant') continue;
    const content = (entry.message && entry.message.content) || [];
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        summaryParts.push(block.text);
      } else if (block.type === 'tool_use' && block.input) {
        const fp = block.input.file_path || block.input.path || block.input.notebook_path;
        if (fp) filesAffected.add(fp);
      }
    }
  }
}

let summary = summaryParts.join(' ').trim();
if (!summary) summary = '(no text response captured)';
if (summary.length > SUMMARY_MAX_LEN) summary = summary.slice(0, SUMMARY_MAX_LEN) + '...';

const filesList = filesAffected.size ? Array.from(filesAffected).join(', ') : 'none';
const timestamp = new Date().toISOString();

fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

const entry = [
  '',
  '---',
  `- timestamp: "${timestamp}"`,
  `- user_prompt: "${sanitize(userPrompt)}"`,
  `- assistant_response_summary: "${sanitize(summary)}"`,
  `- files_affected: "${sanitize(filesList)}"`,
  '',
].join('\n');

fs.appendFileSync(LOG_PATH, entry);
