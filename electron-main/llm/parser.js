// Parses LLM responses
//module.exports = function parser() {};
// Parses and validates LLM responses into structured step objects

/**
 * Extracts JSON from a string, handling both plain JSON and markdown code blocks.
 * 
 * @param {string} text - Raw text response from LLM
 * @returns {object|null} Parsed JSON object or null if no valid JSON found
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Try to find JSON in markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Fall through to plain JSON attempt
    }
  }

  // Try to find plain JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Fall through to error handling
    }
  }

  return null;
}

/**
 * Validates a step object against the expected schema.
 * 
 * @param {object} step - The parsed step object
 * @returns {object} Validation result: { valid: boolean, errors: string[] }
 */
function validateStepSchema(step) {
  const errors = [];

  if (!step || typeof step !== 'object') {
    errors.push('Step must be an object');
    return { valid: false, errors };
  }

  // Check for error response from LLM
  if (step.error === true) {
    if (!step.reason) {
      errors.push('Error response missing "reason" field');
    }
    return { valid: false, errors, isLLMError: true };
  }

  // Validate required fields
  if (!step.step_description || typeof step.step_description !== 'string') {
    errors.push('Missing or invalid "step_description" (must be non-empty string)');
  }

  if (!step.shape || !['circle', 'arrow', 'box'].includes(step.shape)) {
    errors.push(`Invalid "shape": must be one of 'circle', 'arrow', 'box'; got '${step.shape}'`);
  }

  if (!step.label || typeof step.label !== 'string') {
    errors.push('Missing or invalid "label" (must be non-empty string)');
  }

  // Validate bbox structure
  if (!step.bbox || typeof step.bbox !== 'object') {
    errors.push('Missing or invalid "bbox" (must be object)');
  } else {
    const { x, y, width, height } = step.bbox;

    // Validate bbox coordinates are numbers
    if (typeof x !== 'number' || typeof y !== 'number' || 
        typeof width !== 'number' || typeof height !== 'number') {
      errors.push('bbox coordinates must all be numbers (x, y, width, height)');
    }

    // Validate bbox coordinates are normalized (0-1)
    const bboxCoords = [x, y, width, height];
    if (!bboxCoords.every(coord => coord >= 0 && coord <= 1)) {
      errors.push(
        `bbox coordinates must be normalized (0-1). Got: x=${x}, y=${y}, width=${width}, height=${height}`
      );
    }
  }

  // Validate is_final_step is boolean (optional, defaults to false)
  if (step.is_final_step !== undefined && typeof step.is_final_step !== 'boolean') {
    errors.push('"is_final_step" must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes a valid step object by removing extra fields and setting defaults.
 * 
 * @param {object} step - Validated step object
 * @returns {object} Sanitized step with normalized structure
 */
function sanitizeStep(step) {
  return {
    step_description: step.step_description.trim(),
    shape: step.shape.toLowerCase(),
    bbox: {
      x: Number(step.bbox.x),
      y: Number(step.bbox.y),
      width: Number(step.bbox.width),
      height: Number(step.bbox.height)
    },
    label: step.label.trim(),
    is_final_step: step.is_final_step === true
  };
}

/**
 * Parse LLM response into a structured step object.
 * 
 * Handles:
 * - Plain JSON responses
 * - JSON in markdown code blocks
 * - LLM error responses with "error": true
 * - Invalid or malformed responses
 * 
 * @param {string} rawResponse - Raw text response from LLM
 * @returns {Promise<object>} Promise resolving to:
 *   - Success: validated step object with all required fields
 *   - Failure: { error: true, reason: "description" }
 */
function parseStepResponse(rawResponse) {
  // Validate input
  if (!rawResponse || typeof rawResponse !== 'string') {
    return {
      error: true,
      reason: 'LLM returned empty or non-string response'
    };
  }

  // Extract JSON from response
  const json = extractJSON(rawResponse);
  if (!json) {
    return {
      error: true,
      reason: 'Could not extract valid JSON from LLM response'
    };
  }

  // Validate schema
  const validation = validateStepSchema(json);
  
  if (!validation.valid) {
    if (validation.isLLMError) {
      // LLM explicitly returned an error
      return {
        error: true,
        reason: json.reason || 'LLM was unable to determine next step'
      };
    }

    // Schema validation failed
    return {
      error: true,
      reason: `Response validation failed: ${validation.errors.join('; ')}`
    };
  }

  // Sanitize and return
  return sanitizeStep(json);
}

module.exports = {
  parseStepResponse,
  extractJSON,
  validateStepSchema,
  sanitizeStep
};