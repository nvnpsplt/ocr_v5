import { formatInvoicePrompt, parseInvoiceResponse } from './invoiceExtractor';

const API_URL = 'http://135.224.195.180:11434/api/chat';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to clean and validate base64 string
const cleanBase64 = (base64String) => {
  // Remove any whitespace
  base64String = base64String.trim();
  // Remove data URL prefix if present
  if (base64String.includes(',')) {
    base64String = base64String.split(',')[1];
  }
  // Ensure the string is properly padded
  while (base64String.length % 4) {
    base64String += '=';
  }
  return base64String;
};

export const processImageWithRetry = async (base64Image, onProgress) => {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const cleanedBase64 = cleanBase64(base64Image);
      
      const requestBody = {
        model: 'llama3.2-vision',
        messages: [{
          role: 'user',
          content: `You are a multilingual invoice analyzer. First, identify the primary language of the invoice. Then analyze this invoice image and extract the following information, translating all values to English if they are in another language:

1. Invoice number (Look for: invoice #, bill number, 发票号码, Rechnungsnummer, numéro de facture, número de factura, etc.)
2. Invoice Date (Look for: date, billing date, 开票日期, Rechnungsdatum, date de facturation, fecha de factura, etc.)
3. Invoice Amount (Look for: total amount, grand total, 金额, Gesamtbetrag, montant total, importe total, etc.)
4. Currency (Detect the currency symbol or code: $, €, £, ¥, etc.)
5. Legal Entity Details:
   - Name (Look for: company name, business name, 公司名称, Firmenname, nom de l'entreprise, nombre de la empresa)
   - Address (Look for: registered address, 地址, Geschäftsadresse, adresse, dirección)
6. Vendor Information:
   - Name (Look for: vendor, supplier, seller, 供应商, Lieferant, fournisseur, proveedor)
   - Address (Look for: vendor address, supplier address, 供应商地址, Lieferantenadresse, adresse du fournisseur, dirección del proveedor)
7. Payment Information:
   - Terms (Look for: payment terms, due date, 付款条件, Zahlungsbedingungen, conditions de paiement, condiciones de pago)
   - Method (Look for: payment method, 付款方式, Zahlungsmethode, mode de paiement, método de pago)
8. Account Numbers:
   - VAT ID/Tax ID (Look for: VAT, GST, tax number, 税号, Steuernummer, numéro de TVA, número de IVA)
   - GL Account (Look for: GL, general ledger, 总账, Hauptbuch, grand livre, libro mayor)
   - Bank Account (Look for: bank account, IBAN, 银行账号, Kontonummer, compte bancaire, cuenta bancaria)

Format the response as follows:
Invoice number: [value]
Invoice Date: [value]
Invoice Amount: [value]
Currency: [value]
Legal Entity Name: [value]
Legal Entity Address: [value]
Vendor Name: [value]
Vendor Address: [value]
Payment Terms: [value]
Payment Method: [value]
VAT ID: [value]
GL Account Number: [value]
Bank Account Number: [value]

Important:
- If any field is not found, write "not available"
- Convert all dates to DD/MM/YYYY format
- Convert all amounts to standard numerical format (e.g., 1,234.56)
- Preserve any ID numbers exactly as shown
- If detecting multiple possible values, choose the most likely one based on context`,
          images: [cleanedBase64]
        }],
        stream: true,
        options: {
          temperature: 0.3,
          max_tokens: 2048
        }
      };

      // Log request details for debugging
      console.log('Request URL:', API_URL);
      console.log('Request headers:', {
        'Content-Type': 'application/json'
      });
      console.log('Request body structure:', {
        model: requestBody.model,
        messageCount: requestBody.messages.length,
        firstMessageContent: typeof requestBody.messages[0].content,
        hasImages: !!requestBody.messages[0].images,
        imageCount: requestBody.messages[0].images?.length,
        imageSize: requestBody.messages[0].images[0].length,
        options: requestBody.options
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      console.log('Starting to read response stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log('Raw chunk:', chunk); // Log the raw chunk

        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            console.log('Parsed JSON:', json); // Log the parsed JSON
            
            if (json.message?.content) {
              fullText += json.message.content;
              console.log('Current fullText:', fullText); // Log the accumulated text
              onProgress?.(fullText);
            }
          } catch (e) {
            console.warn('Error parsing chunk:', e, 'Raw chunk:', line);
          }
        }
      }

      console.log('Final full text:', fullText); // Log the final text

      if (!fullText.trim()) {
        throw new Error('No text was extracted from the image');
      }

      // Clean the full text before parsing
      fullText = fullText
        .replace(/```[^`]*```/g, '')     // Remove code blocks
        .replace(/\*\*/g, '')            // Remove all ** markers
        .replace(/#+\s/g, '')            // Remove headers
        .replace(/\n\s*\n/g, '\n')       // Remove empty lines
        .trim();

      console.log('Cleaned full text:', fullText);
      return parseInvoiceResponse(fullText);
    } catch (error) {
      retries++;
      console.error(`Attempt ${retries} failed:`, error);
      
      if (retries === MAX_RETRIES) {
        throw new Error(`Failed after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      
      await sleep(RETRY_DELAY * retries);
    }
  }
};
