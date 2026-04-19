export interface AnonymizationMap {
  [token: string]: string; // e.g. "EMP_001": "BP4598394"
}

export interface SanitizationResult {
  sanitizedPrompt: string;
  dictionary: AnonymizationMap;
}

/**
 * Enterprise AI Security: Dynamic Anonymizer
 * 
 * Intercepts LLM payloads and scrubs Personally Identifiable Information (PII)
 * before sending data to third-party endpoints like Google Gemini or OpenRouter.
 * It creates a mapping (dictionary) to de-anonymize the results safely internally.
 */

export class AISecurityAnonymizer {
  
  /**
   * Replaces real employee BPs or Names with generic tokens (e.g. EMP_1, EMP_2)
   */
  static sanitizeContext(rawContext: string, employeeIdentifiers: string[]): SanitizationResult {
    let sanitizedPrompt = rawContext;
    const dictionary: AnonymizationMap = {};
    let counter = 1;

    // Filter out empties and sort by length descending to prevent partial replacements 
    // e.g. replacing '123' and missing '12345'
    const safeIdentifiers = employeeIdentifiers
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    for (const identifier of safeIdentifiers) {
      // If we haven't mapped this identifier yet
      const existingToken = Object.keys(dictionary).find(key => dictionary[key] === identifier);
      
      let tokenToUse;
      if (existingToken) {
        tokenToUse = existingToken;
      } else {
        tokenToUse = `{{EMP_TOKEN_${counter}}}`;
        dictionary[tokenToUse] = identifier;
        counter++;
      }

      // Replace globally in the prompt
      // Note: In production you'd use boundaries (\b) depending on the identifier type
      const regex = new RegExp(this.escapeRegExp(identifier), 'gi');
      sanitizedPrompt = sanitizedPrompt.replace(regex, tokenToUse);
    }

    // Additional generic PII scrubbers could be added here (Regex for emails, phones)
    // sanitizedPrompt = sanitizedPrompt.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, '{{EMAIL_REMOVED}}');

    return { sanitizedPrompt, dictionary };
  }

  /**
   * Restores the PII to the safely returned LLM payload
   */
  static deanonymizeResponse(safeResponse: string, dictionary: AnonymizationMap): string {
    let originalResponse = safeResponse;
    
    // Sort keys descending so EMP_TOKEN_10 is replaced before EMP_TOKEN_1
    const tokens = Object.keys(dictionary).sort((a, b) => b.length - a.length);

    for (const token of tokens) {
      const realPii = dictionary[token];
      const regex = new RegExp(this.escapeRegExp(token), 'g');
      originalResponse = originalResponse.replace(regex, realPii);
    }

    return originalResponse;
  }

  private static escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}
