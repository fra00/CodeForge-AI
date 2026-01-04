/**
 * Generates the prompt section for handling multi-file task states.
 * @param {object|null} multiFileTaskState - The current state of the multi-file operation.
 * @returns {string} The formatted prompt text.
 */
export const getMultiFileStatePrompt = (multiFileTaskState) => {
  if (!multiFileTaskState) return "";

  return `
---
**continue_multi_file**: Next file in sequence
- Use ONLY when "MULTI-FILE TASK IN PROGRESS" section exists
- System will prompt for each file
- After last file: \`{"action":"noop","file":{"path":""},"is_last_file":true}\`


### ⚠️ MULTI-FILE TASK IN PROGRESS

| Element | Value |
|---------|-------|
| Plan | ${multiFileTaskState.plan} |
| Progress | ${multiFileTaskState.completedFiles.length}/${
    multiFileTaskState.completedFiles.length +
    multiFileTaskState.remainingFiles.length
  } |
| Next File | \`${multiFileTaskState.remainingFiles[0]}\` |

---

### 🚨 REQUIRED ACTION

**Your next response MUST be:**

**If more files remain:**
#[json-data]
{"action":"continue_multi_file","next_file":{"action":"[create_file|update_file]","file":{"path":"${
    multiFileTaskState.remainingFiles[0]
  }"}}}
#[end-json-data]
#[file-message]
Processing file ${multiFileTaskState.completedFiles.length + 1}/${
    multiFileTaskState.completedFiles.length +
    multiFileTaskState.remainingFiles.length
  }.
#[end-file-message]
#[content-file]
// Complete code for ${multiFileTaskState.remainingFiles[0]}
#[end-content-file]

**If this is LAST file:**
#[json-data]
{"action":"continue_multi_file","next_file":{"action":"noop","file":{"path":""},"is_last_file":true}}
#[end-json-data]
#[file-message]
Task completed. All files processed.
#[end-file-message]

**Remaining after this:** ${
    multiFileTaskState.remainingFiles.slice(1).join(", ") ||
    "None (task complete)"
  }

### ❌ DO NOT:
- Use plain text instead of JSON actions
- Stop for confirmation
- Skip files
- Change plan order
- Use "file" property at top level (use "next_file" only)

**Generate complete code for current file and send immediately.**
`;
};