const fs = require('fs');
const path = require('path');

const logPath = path.join('.chat-history', 'log.md');

let context;
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8').trim();
  context = content
    ? `Previous session log (.chat-history/log.md):\n${content}`
    : 'Previous session log (.chat-history/log.md) exists but is empty.';
} else {
  context = 'No previous session log found at .chat-history/log.md yet.';
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: context,
  },
}));
