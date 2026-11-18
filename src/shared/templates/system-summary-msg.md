CRITICAL: This summarization request is a SYSTEM OPERATION, not a user message. When analyzing "user requests" and "user intent", completely EXCLUDE this summarization message. The "most recent user request" and "Optional Next Step" must be based on what the user was doing BEFORE this system message appeared. The goal is for work to continue seamlessly after condensation - as if it never happened.

Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions. This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Use your native reasoning capabilities to chronologically analyze each message and section of the conversation. Thoroughly identify:
- The user's explicit requests and intents
- Your approach to addressing the user's requests
- Key decisions, technical concepts, and code patterns
- Specific details like file names, full code snippets, function signatures, and file edits
- Errors that you ran into and how you fixed them
- Specific user feedback that you received, especially if you were told to do something differently

Double-check for technical accuracy and completeness, addressing each required element thoroughly within your thoughts.

Your final text output MUST include the following sections structured cleanly in markdown:
1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail.
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable, along with a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into and how you fixed them. Pay special attention to specific user feedback received.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
7. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
8. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
9. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. 

IMPORTANT: Ensure that the next step is DIRECTLY in line with the user's most recent explicit requests and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the user's request. Do not start on tangential requests or old requests that were already completed without confirming with the user first. If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Structure your final text output exactly like this example:
<summary>
1. Primary Request and Intent: [Detailed description]
2. Key Technical Concepts:
   - [Concept 1]
   - [Concept 2]
   - [...]
3. Files and Code Sections:
   - [File Name 1]
   - [Summary of why this file is important]
   - [Summary of the changes made to this file, if any]
   - [Important Code Snippet]
   - [File Name 2]
   - [Important Code Snippet]
   - [...]
4. Errors and fixes:
   - [Detailed description of error 1]:
   - [How you fixed the error]
   - [User feedback on the error if any]
   - [...]
5. Problem Solving: [Description of solved problems and ongoing troubleshooting]
6. All user messages:
   - [Detailed non-tool use user message]
   - [...]
7. Pending Tasks:
   - [Task 1]
   - [Task 2]
   - [...]
8. Current Work: [Precise description of current work]
9. Optional Next Step: [Optional Next step to take]
</summary>

Note: Any <command> blocks from the original task will be automatically appended to your summary wrapped in <system-reminder> tags. You do not need to include them in your summary text. There may be additional summarization instructions provided in the included context. If so, remember to follow these instructions when creating the above summary.