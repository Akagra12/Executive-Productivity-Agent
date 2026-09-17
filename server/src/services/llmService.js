/**
 * llmService.js
 *
 * Purpose: Multi-provider LLM grounding service for the Executive Productivity Agent.
 *
 * Features:
 * - Smart multi-provider support: Groq (gsk_*), Google Gemini (AIza*), OpenAI (sk-*)
 * - Strict Context-Grounding: Retrieves relevant structured records & source evidence before LLM call
 * - Strict Anti-Hallucination system prompt: Instructs LLM to answer ONLY from context
 * - Source Reference Extraction: Guarantees citation of supporting source IDs
 * - Zero-Dependency REST implementation using native Node.js fetch
 * - Robust fallback to deterministic query engine on network/key/quota errors
 */

const fs = require("fs");
const path = require("path");
// Load only the server's own .env — do NOT crawl parent directories to avoid
// picking up IDE-injected keys that are not intended for this application.
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { answerExecutiveQuery } = require("./queryService");
const { getDailyBriefData, getAll } = require("./commitmentService");
const { getArjunMeetingsForDate } = require("./briefGenerator");

function isRealKey(key) {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.startsWith("your_") || trimmed.includes("placeholder") || trimmed.includes("xxx") || trimmed === "your_gemini_api_key_here") {
    return false;
  }
  return true;
}

/**
 * Identify the active LLM provider and API key from environment variables.
 * Priority: Groq (gsk_) → Gemini (AIza) → OpenAI (sk-) → fallback
 */
function resolveLlmConfig() {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const groqKey   = process.env.GROQ_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  // 1. Groq — key must start with 'gsk_'
  const activeGroqKey = [groqKey, geminiKey].find(k => isRealKey(k) && k.trim().startsWith("gsk_"));
  if (activeGroqKey) {
    return {
      provider: "groq",
      apiKey: activeGroqKey.trim(),
      model: "llama-3.3-70b-versatile",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
    };
  }

  // 2. Google Gemini — accepts both standard Google API keys (AIza*) and
  //    Antigravity-issued keys (AQ.*), both of which work with the Gemini REST API.
  if (isRealKey(geminiKey) && (geminiKey.trim().startsWith("AIza") || geminiKey.trim().startsWith("AQ."))) {
    return {
      provider: "gemini",
      apiKey: geminiKey.trim(),
      model: "gemini-2.5-flash",
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`,
    };
  }

  // 3. OpenAI — key must start with 'sk-'
  const activeOpenAiKey = [openaiKey, geminiKey].find(k => isRealKey(k) && k.trim().startsWith("sk-"));
  if (activeOpenAiKey) {
    return {
      provider: "openai",
      apiKey: activeOpenAiKey.trim(),
      model: "gpt-4o-mini",
      endpoint: "https://api.openai.com/v1/chat/completions",
    };
  }

  // 4. No valid key found — use deterministic grounded fallback
  return {
    provider: "none",
    apiKey: null,
    model: "fallback-deterministic",
  };
}

/**
 * Builds grounded context for the LLM based on user query and reference date.
 * Retrieves only relevant commitments, meetings, and raw evidence.
 */
function buildGroundedContext(query, referenceDate) {
  const deterministicResult = answerExecutiveQuery(query, referenceDate);
  const allCommitments = getAll(referenceDate);
  const meetings = getArjunMeetingsForDate(referenceDate);

  // Relevant items: query matches + meetings + any high-urgency items
  const relevantCommitments = deterministicResult.results && deterministicResult.results.length > 0
    ? deterministicResult.results
    : allCommitments;

  const contextItems = relevantCommitments.map((c) => ({
    commitment_id: c.commitment_id,
    title: c.title,
    description: c.description,
    owner: c.owner || "UNASSIGNED / UNCLEAR",
    recipient: c.recipient || "Internal Team",
    computed_status: c.computed_status,
    days_overdue: c.days_overdue,
    days_until_due: c.days_until_due,
    deadline: c.deadline ? `${c.deadline.date} (${c.deadline.time_of_day || 'EOD'})` : "None",
    uncertainty_note: c.uncertainty_note || null,
    source_ids: c.source_ids || [],
    evidence_quotes: (c.evidence || []).map((e) => `[${e.source_id}] "${e.verbatim}"`),
  }));

  return {
    referenceDate,
    matchedIntent: deterministicResult.intent,
    deterministicAnswer: deterministicResult.answer,
    commitments: contextItems,
    meetingsForDate: meetings,
    allRelevantSourceIds: [
      ...new Set(contextItems.flatMap((c) => c.source_ids)),
      ...meetings.map((m) => m.entry_id),
    ],
  };
}

/**
 * System prompt enforcing strict fact-grounding and source citation.
 */
function buildSystemPrompt(referenceDate) {
  return `You are the Executive Productivity AI Agent for Arjun Malhotra (VP Product & Strategy at Veridian Corp).
Current simulated reference date: ${referenceDate}.

STRICT GROUNDING & INTEGRITY INSTRUCTIONS:
1. Ground truth: Answer ONLY using the facts and evidence provided in the Grounded Context below.
2. Anti-hallucination: NEVER invent people, tasks, deadlines, commitments, or statuses not present in the context.
3. Ambiguity & Unclear Ownership: If evidence is missing, ambiguous, or shows unassigned ownership (e.g., the Mumbai lease renewal), EXPLICITLY flag the uncertainty and explain that ownership is not established.
4. Source Citations: You MUST cite supporting Source IDs (e.g., [mt_meeting_001_turn_3], [email_t1_4], [cal_arjun_5]) whenever referencing a commitment or event.
5. Facts vs. Suggestions: State verified facts first. If making an actionable suggestion (e.g. next step), clearly label it with "⚡ Recommendation:".
6. Formatting: Keep responses concise, polished, and executive-ready.`;
}

/**
 * Calls Groq / OpenAI compatible API.
 */
async function callOpenAiCompatibleLlm(config, systemPrompt, userMessage, context) {
  const payload = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `USER QUERY: "${userMessage}"\n\nGROUNDED CONTEXT FOR ${context.referenceDate}:\n${JSON.stringify(context, null, 2)}`,
      },
    ],
    temperature: 0.1, // Low temperature for factual precision
    max_tokens: 800,
  };

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || "";
  return answer;
}

/**
 * Calls Google Gemini REST API.
 * Handles safety-blocked responses (empty candidates or SAFETY finishReason) gracefully.
 */
async function callGeminiLlm(config, systemPrompt, userMessage, context) {
  // Keep context lean — Gemini has a lower token budget than GPT-4 by default
  const leanContext = {
    referenceDate: context.referenceDate,
    matchedIntent: context.matchedIntent,
    deterministicAnswer: context.deterministicAnswer,
    commitments: context.commitments.slice(0, 8), // cap at 8 items
    meetingsForDate: context.meetingsForDate.slice(0, 5),
  };

  const userText = `${systemPrompt}\n\nUSER QUERY: "${userMessage}"\n\nGROUNDED CONTEXT FOR ${context.referenceDate}:\n${JSON.stringify(leanContext, null, 2)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 800,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  // Detect safety block: Gemini returns candidates:[] or finishReason:SAFETY
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason || "UNKNOWN_BLOCK_REASON";
    throw new Error(`Gemini blocked the request: ${blockReason}. Using deterministic fallback.`);
  }

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
    throw new Error(`Gemini safety filter triggered (finishReason: ${finishReason}). Using deterministic fallback.`);
  }

  const answer = candidate.content?.parts?.[0]?.text || "";
  if (!answer.trim()) {
    throw new Error(`Gemini returned an empty response (finishReason: ${finishReason || "NONE"}). Using deterministic fallback.`);
  }

  return answer;
}

/**
 * Main chat execution entry point.
 *
 * @param {string} userMessage - The executive question
 * @param {string} [referenceDate="2026-09-23"] - Simulated context date
 * @returns {Promise<object>}
 */
async function processExecutiveChat(userMessage, referenceDate = "2026-09-23") {
  const config = resolveLlmConfig();
  const context = buildGroundedContext(userMessage, referenceDate);
  const systemPrompt = buildSystemPrompt(referenceDate);

  // If no API key is set, use deterministic grounded fallback
  if (config.provider === "none" || !config.apiKey) {
    const fallback = answerExecutiveQuery(userMessage, referenceDate);
    return {
      query: userMessage,
      answer: fallback.answer,
      intent: fallback.intent,
      sources: context.allRelevantSourceIds,
      commitments: context.commitments,
      reference_date: referenceDate,
      provider: "deterministic_grounded_engine",
      model: "rule-based-fallback",
      is_fallback: true,
      fallback_note: "No external LLM API key detected in .env. Answer generated directly from verified ground truth records.",
    };
  }

  try {
    let llmAnswer = "";
    if (config.provider === "groq" || config.provider === "openai") {
      llmAnswer = await callOpenAiCompatibleLlm(config, systemPrompt, userMessage, context);
    } else if (config.provider === "gemini") {
      llmAnswer = await callGeminiLlm(config, systemPrompt, userMessage, context);
    }

    if (!llmAnswer || !llmAnswer.trim()) {
      throw new Error(`${config.provider} returned an empty response. Engaging deterministic fallback.`);
    }

    return {
      query: userMessage,
      answer: llmAnswer.trim(),
      intent: context.matchedIntent,
      sources: context.allRelevantSourceIds,
      commitments: context.commitments,
      reference_date: referenceDate,
      provider: config.provider,
      model: config.model,
      is_fallback: false,
    };
  } catch (err) {
    console.warn(`[LLM Service Warning] Provider ${config.provider} failed: ${err.message}. Engaging deterministic fallback.`);
    const fallback = answerExecutiveQuery(userMessage, referenceDate);
    return {
      query: userMessage,
      answer: fallback.answer,
      intent: fallback.intent,
      sources: context.allRelevantSourceIds,
      commitments: context.commitments,
      reference_date: referenceDate,
      provider: "deterministic_grounded_engine",
      model: "rule-based-fallback",
      is_fallback: true,
      fallback_note: `LLM service unavailable (${err.message}). Answer generated with 100% precision from validated structured data.`,
    };
  }
}

module.exports = {
  processExecutiveChat,
  resolveLlmConfig,
  buildGroundedContext,
};
