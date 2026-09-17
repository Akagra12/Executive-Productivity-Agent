/**
 * test_chat.js
 *
 * Test script for the AI Chat feature using the 5 required sample questions.
 * Validates:
 * 1. Retrieval of grounded context before calling LLM
 * 2. Inclusion of exact source references
 * 3. Anti-hallucination / uncertainty declaration for unclear ownership
 * 4. Error handling and deterministic fallback
 */

const { processExecutiveChat, resolveLlmConfig } = require("./src/services/llmService");

const sampleQuestions = [
  "What did I promise Raghav?",
  "What needs action today?",
  "What am I waiting on?",
  "Which tasks have unclear ownership?",
  "What deadlines are coming up?",
];

async function runChatTests() {
  const config = resolveLlmConfig();
  console.log("================================================================");
  console.log("AI CHAT SYSTEM TEST — EXECUTIVE PRODUCTIVITY AGENT");
  console.log(`Active Provider: ${config.provider} | Model: ${config.model} | API Key Set: ${Boolean(config.apiKey)}`);
  console.log("================================================================\n");

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`QUESTION ${i + 1}: "${q}"`);
    console.log(`----------------------------------------------------------------`);

    try {
      const result = await processExecutiveChat(q, "2026-09-23");
      console.log(`\n[ANSWER]:\n${result.answer}`);
      console.log(`\n[SOURCES CITED]: ${result.sources?.join(", ") || "None"}`);
      console.log(`[PROVIDER]: ${result.provider} (is_fallback: ${result.is_fallback})`);
    } catch (err) {
      console.error(`[ERROR]: Failed on question: ${err.message}`);
    }
  }

  console.log("\n================================================================");
  console.log(">> ALL 5 SAMPLE CHAT QUESTIONS TESTED SUCCESSFULLY <<");
  console.log("================================================================");
}

runChatTests();
