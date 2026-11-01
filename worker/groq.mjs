export const GROQ_MODEL = 'qwen/qwen3.8-27b';

export async function runGroqAnalysis(apiKey, messages, maxOutputTokens = 350) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_completion_tokens: maxOutputTokens, reasoning_effort: 'none' })
  });
  if (!response.ok) {
    const error = new Error('groq_unavailable');
    error.status = response.status;
    throw error;
  }
  const result = await response.json();
  const answer = result?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('groq_empty_response');
  return {
    answer: answer.trim(),
    usage: result.usage || {},
    model: GROQ_MODEL
  };
}
