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

  // Check for error response from LLM (handled earlier in parseStepResponse,
  // but keep a guard here for defensive programming)
  if (step.error === true || typeof step.error === 'string') {
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

  // Short-circuit for explicit LLM error responses.
  // New format from prompt: { "error": "not_visible" }
  // Legacy format still supported: { "error": true, "reason": "..." }
  if (json && (json.error === true || typeof json.error === 'string')) {
    const reason =
      typeof json.reason === 'string'
        ? json.reason
        : typeof json.error === 'string'
          ? json.error
          : 'LLM was unable to determine next step';
    return {
      error: true,
      reason
    };
  }

  // STRICT BBOX HANDLING: Expect an array [x0, y0, x1, y1] with normalized coords 0..1
  if (!json || typeof json !== 'object') {
    return {
      error: true,
      reason: 'Parsed JSON is not an object'
    };
  }

  if (!('bbox' in json)) {
    return {
      error: true,
      reason: 'Missing required "bbox" field; expected array [x0,y0,x1,y1]'
    };
  }

  const bboxRaw = json.bbox;
  if (!Array.isArray(bboxRaw) || bboxRaw.length !== 4) {
    return {
      error: true,
      reason: 'Invalid bbox format: expected an array of four numbers [x0,y0,x1,y1]'
    };
  }

  const nums = bboxRaw.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return {
      error: true,
      reason: `BBox entries must be finite numbers. Got: ${bboxRaw}`
    };
  }

  const [x0, y0, x1, y1] = nums;

  // Ensure normalized range
  if ([x0, y0, x1, y1].some((v) => v < 0 || v > 1)) {
    return {
      error: true,
      reason: `BBox values must be in range [0,1]. Got: [${nums.join(', ')}]`
    };
  }

  // Ensure ordering
  if (!(x0 < x1 && y0 < y1)) {
    return {
      error: true,
      reason: `BBox coordinates must satisfy x0 < x1 and y0 < y1. Got: [${nums.join(', ')}]`
    };
  }

  // Convert to internal x,y,width,height form and clamp minimally for safety
  let x = x0;
  let y = y0;
  let width = x1 - x0;
  let height = y1 - y0;

  // Minimal non-zero size
  const MIN_SIZE = 0.0001;
  width = Math.max(MIN_SIZE, width);
  height = Math.max(MIN_SIZE, height);

  // Ensure box fits within [0,1]
  if (x + width > 1) {
    width = 1 - x;
  }
  if (y + height > 1) {
    height = 1 - y;
  }

  json.bbox = { x, y, width, height };

  // Normalize shape casing
  if (json && json.shape && typeof json.shape === 'string') {
    json.shape = json.shape.toLowerCase();
  }

  // Coerce common shape aliases returned by some models
  // Map 'rect'/'rectangle'/'square' → 'box', 'ellipse'/'oval' → 'circle'
  if (json && typeof json.shape === 'string') {
    const shapeAliases = {
      rect: 'box',
      rectangle: 'box',
      square: 'box',
      box: 'box',
      ellipse: 'circle',
      oval: 'circle',
      circle: 'circle',
      arrow: 'arrow',
      pointer: 'arrow'
    };
    if (shapeAliases[json.shape]) {
      json.shape = shapeAliases[json.shape];
    }
  }

  // Default is_final_step if missing
  if (json && json.is_final_step === undefined) {
    json.is_final_step = false;
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