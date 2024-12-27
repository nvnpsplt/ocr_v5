const API_URL = 'http://135.224.195.180:11434/api/generate';

export const chatWithInvoice = async (question, invoiceData, onProgress) => {
  try {
    const requestBody = {
      model: 'llama3.2-vision',
      prompt: `You are an AI assistant specialized in analyzing invoice data. You have access to the following invoice information:
${Object.entries(invoiceData)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

User question: ${question}

Please provide a clear and concise answer based on the invoice data. If asked about information not present in the invoice, clearly state that the information is not available.`,
      stream: true,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    let accumulatedResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            accumulatedResponse += json.response;
            onProgress?.(accumulatedResponse);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    }

    return accumulatedResponse;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
};
