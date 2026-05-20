// Replicate and test the parser regex logic inside a lightweight node test script to verify matches
const dayjs = require("dayjs");

const PATTERNS = {
  iOS: /^\[(\d{2,4}[-/.]\d{2}[-/.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\]\s+([^:]+):\s+(.+)$/i,
  iOSSystem: /^\[(\d{2,4}[-/.]\d{2}[-/.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\]\s+(.+)$/i,
  Android: /^(\d{2,4}[-/.]\d{2}[-/.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*([^:]+):\s+(.+)$/i,
  AndroidSystem: /^(\d{2,4}[-/.]\d{2}[-/.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(.+)$/i,
};

const MEDIA_PATTERNS = [
  /\<attached:\s*([^\>]+)\>/i,
  /^([^\(\n\r]+)\s*\(file attached\)/i,
  /\<attachment:\s*([^\>]+)\>/i,
];

function getMessageType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["opus", "mp3", "m4a", "wav"].includes(ext)) return "audio";
  return "document";
}

function parseLine(line) {
  let match = line.match(PATTERNS.iOS);
  if (match) {
    return {
      style: "iOS",
      date: match[1],
      time: match[2],
      sender: match[3],
      content: match[4]
    };
  }

  match = line.match(PATTERNS.Android);
  if (match) {
    return {
      style: "Android",
      date: match[1],
      time: match[2],
      sender: match[3],
      content: match[4]
    };
  }

  let sysMatch = line.match(PATTERNS.iOSSystem);
  if (sysMatch) {
    return {
      style: "iOSSystem",
      date: sysMatch[1],
      time: sysMatch[2],
      content: sysMatch[3]
    };
  }

  sysMatch = line.match(PATTERNS.AndroidSystem);
  if (sysMatch) {
    return {
      style: "AndroidSystem",
      date: sysMatch[1],
      time: sysMatch[2],
      content: sysMatch[3]
    };
  }

  return null;
}

// Running Test Cases
console.log("=== STARTING PARSER REGEX VERIFICATION TESTS ===");

const testCases = [
  {
    line: "[12/04/26, 8:42:15 PM] John Doe: Hello there!",
    expected: { style: "iOS", sender: "John Doe", content: "Hello there!" }
  },
  {
    line: "[12/04/2026, 20:42 PM] Alice: <attached: Audio.opus>",
    expected: { style: "iOS", sender: "Alice", content: "<attached: Audio.opus>" }
  },
  {
    line: "12/04/26, 8:42 PM - Bob: image.png (file attached)",
    expected: { style: "Android", sender: "Bob", content: "image.png (file attached)" }
  },
  {
    line: "[12/04/26, 8:42:15 PM] Messages and calls are end-to-end encrypted.",
    expected: { style: "iOSSystem", content: "Messages and calls are end-to-end encrypted." }
  },
  {
    line: "12/04/26, 8:42 PM - John created group \"Awesome Group\"",
    expected: { style: "AndroidSystem", content: "John created group \"Awesome Group\"" }
  }
];

let failed = false;
testCases.forEach((tc, idx) => {
  const result = parseLine(tc.line);
  if (!result) {
    console.error(`❌ Test ${idx + 1} Failed: Got null result for "${tc.line}"`);
    failed = true;
    return;
  }

  const keys = Object.keys(tc.expected);
  let passed = true;
  keys.forEach(key => {
    if (result[key] !== tc.expected[key]) {
      passed = false;
    }
  });

  if (passed) {
    console.log(`✅ Test ${idx + 1} Passed: Style [${result.style}] matches expected!`);
  } else {
    console.error(`❌ Test ${idx + 1} Failed:`, { expected: tc.expected, got: result });
    failed = true;
  }
});

// Test Media Extraction
console.log("\n=== VERIFYING ATTACHMENT EXTRACTION ===");
const mediaTests = [
  { content: "<attached: voice-note.opus>", expectedType: "audio", file: "voice-note.opus" },
  { content: "photo.jpg (file attached)", expectedType: "image", file: "photo.jpg" }
];

mediaTests.forEach((mt, idx) => {
  let file = null;
  for (const pattern of MEDIA_PATTERNS) {
    const match = mt.content.match(pattern);
    if (match) {
      file = match[1].trim();
      break;
    }
  }

  if (file === mt.file && getMessageType(file) === mt.expectedType) {
    console.log(`✅ Media ${idx + 1} Passed: Extracted [${file}] of type [${mt.expectedType}]`);
  } else {
    console.error(`❌ Media ${idx + 1} Failed: Got [${file}] but expected [${mt.file}]`);
    failed = true;
  }
});

if (!failed) {
  console.log("\n⭐️ ALL REGEX AND EXTRACTION TESTS PASSED SUCCESSFULLY! ⭐️");
  process.exit(0);
} else {
  console.error("\n❌ SOME TESTS FAILED.");
  process.exit(1);
}
