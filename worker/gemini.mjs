export const GEMINI_MODEL = 'gemini-2.5-flash';

export async function runGeminiAnalysis(apiKey, messages) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages[0].content }] },
      contents: messages.slice(1).map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      generationConfig: { maxOutputTokens: 350 }
    })
  });
  if (!response.ok) {
    const error = new Error('gemini_unavailable');
    error.status = response.status;
    throw error;
  }
  const result = await response.json();
  const answer = result?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('')?.trim();
  if (!answer) throw new Error('gemini_empty_response');
  return {
    answer,
    usage: {
      prompt_tokens: result.usageMetadata?.promptTokenCount,
      completion_tokens: result.usageMetadata?.candidatesTokenCount
    },
    model: GEMINI_MODEL
  };
}
