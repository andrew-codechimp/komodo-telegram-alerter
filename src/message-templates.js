import fs from 'fs';
import path from 'path';

const templatesPath = path.join(process.cwd(), 'config', 'templates.json');
let templates = {};

try {
  const data = fs.readFileSync(templatesPath, 'utf8');
  templates = JSON.parse(data);
  console.log('[INFO] Templates loaded successfully');
} catch (err) {
  console.error('[ERROR] Failed to load templates:', err);
  process.exit(1);
}

/**
 * Format message using template and data
 * @param {string} template - Template string with placeholders
 * @param {object} data - Data object
 * @returns {string} Formatted message
 */
function formatTemplate(template, data) {
  const missingFields = [];
  const result = template.replace(/\{(\w+)\}/g, (match, key) => {
    // We first check for a direct match, then look for nested properties
    let value = data[key];
    if (value === undefined && data.err && data.err[key] !== undefined) {
      value = data.err[key];
    }
    
    if (value === undefined) {
      missingFields.push(key);
      return match;
    }
    // Round off numerical values ​​to 2 decimal places
    if (typeof value === 'number') {
      return parseFloat(value.toFixed(2));
    }
    return value;
  });
  
  if (missingFields.length > 0) {
    console.warn(`[WARN] Missing fields in template data: ${missingFields.join(', ')}`);
  }
  
  return result;
}

/**
 * Get formatted message for alert
 * @param {string} type - Alert type (e.g. 'StackAutoUpdated')
 * @param {string} status - Alert status (e.g. 'OK')
 * @param {object} data - Alert data
 * @returns {{message: string, disable_notification: boolean}|null} Formatted message and notification setting, or null if template not found
 */
export function getMessage(type, status, data) {
  try {
    const templateConfig = templates[type]?.[status];
    if (!templateConfig) {
      console.warn(`[WARN] No template found for type: ${type}, status: ${status}`);
      return null;
    }
    
    // Support both old string format and new object format
    if (typeof templateConfig === 'string') {
      return {
        message: formatTemplate(templateConfig, data),
        disable_notification: undefined
      };
    }
    
    // New object format with template and disable_notification
    return {
      message: formatTemplate(templateConfig.template, data),
      disable_notification: templateConfig.disable_notification
    };
  } catch (err) {
    console.error(`[ERROR] Failed to generate message: ${err.message}`);
    return null;
  }
}