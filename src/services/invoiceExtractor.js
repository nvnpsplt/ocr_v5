export const formatInvoicePrompt = () => {
  return `You are an invoice data extraction assistant. Extract the following information from the invoice image in a structured format. For any field that is not found in the image, write "not available".

Please extract:
1. Invoice number
2. Invoice Date
3. Invoice Amount
4. Currency
5. Legal Entity Name
6. Legal Entity Address
7. Vendor Name
8. Vendor Address
9. Payment Terms
10. Payment Method
11. VAT ID
12. GL Account Number
13. Bank Account Number

Format your response as:
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
Bank Account Number: [value]`;
};

export const parseInvoiceResponse = (response) => {
  console.log('Starting to parse response:', response);
  
  const fields = [
    'Invoice number',
    'Invoice Date',
    'Invoice Amount',
    'Currency',
    'Legal Entity Name',
    'Legal Entity Address',
    'Vendor Name',
    'Vendor Address',
    'Payment Terms',
    'Payment Method',
    'VAT ID',
    'GL Account Number',
    'Bank Account Number'
  ];

  const result = {};
  
  // Create a map of normalized field names to actual field names
  const fieldMap = fields.reduce((acc, field) => {
    acc[field.toLowerCase()] = field;
    return acc;
  }, {});

  // Split into lines and clean up
  const lines = response.split('\n')
    .map(line => line.trim())
    .filter(line => line);

  console.log('Processing lines:', lines);

  // Process each line
  lines.forEach(line => {
    // Find matching field
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const fieldPart = line.substring(0, colonIndex).trim().toLowerCase();
    const valuePart = line.substring(colonIndex + 1).trim();

    // Find the matching field name
    const matchedField = Object.keys(fieldMap).find(key => 
      fieldPart === key || fieldPart.includes(key)
    );

    if (matchedField) {
      const actualField = fieldMap[matchedField];
      const cleanValue = valuePart
        .replace(/^\[|\]$/g, '')  // Remove square brackets
        .replace(/^\*\*|\*\*$/g, '')  // Remove ** markers
        .trim();
      
      result[actualField] = cleanValue || 'not available';
      console.log(`Matched field "${actualField}":`, cleanValue);
    }
  });

  // Fill in any missing fields
  fields.forEach(field => {
    if (!result[field]) {
      result[field] = 'not available';
      console.log(`Field "${field}" not found in response`);
    }
  });

  console.log('Final parsed result:', result);
  return result;
}
