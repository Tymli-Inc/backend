import { promisify } from 'util';
import dns from 'dns';

const resolveMx = promisify(dns.resolveMx);

// Mailboxlayer API configuration
const MAILBOXLAYER_API_KEY = process.env.MAILBOXLAYER_API_KEY;
const MAILBOXLAYER_BASE_URL = 'https://apilayer.net/api/check';

/**
 * Validates email format using regex
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email format is valid
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks if a domain has valid MX records
 * @param {string} domain - The domain to check
 * @returns {Promise<boolean>} - True if domain has valid MX records
 */
async function hasValidMxRecord(domain) {
    try {
        const mxRecords = await resolveMx(domain);
        return mxRecords && mxRecords.length > 0;
    } catch (error) {
        // DNS resolution failed, domain likely doesn't exist or has no MX records
        return false;
    }
}

/**
 * Verifies email using Mailboxlayer API
 * @param {string} email - The email address to verify
 * @returns {Promise<{isValid: boolean, error?: string, details?: object}>} - Verification result
 */
async function verifyEmailWithMailboxlayer(email) {
    try {
        const url = `${MAILBOXLAYER_BASE_URL}?access_key=${MAILBOXLAYER_API_KEY}&email=${encodeURIComponent(email)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if API returned an error
        if (data.error) {
            return {
                isValid: false,
                error: `Mailboxlayer API error: ${data.error.info || data.error.type}`,
                details: data
            };
        }
        
        // Check various validation criteria
        if (!data.format_valid) {
            return {
                isValid: false,
                error: "Invalid email format",
                details: data
            };
        }
        
        if (!data.mx_found) {
            return {
                isValid: false,
                error: "Domain does not have valid mail server (MX record not found)",
                details: data
            };
        }
        
        if (!data.smtp_check) {
            return {
                isValid: false,
                error: "Email address cannot receive mail (SMTP check failed)",
                details: data
            };
        }
        
        if (data.disposable) {
            return {
                isValid: false,
                error: "Disposable email addresses are not allowed",
                details: data
            };
        }
        
        if (data.role) {
            return {
                isValid: false,
                error: "Role-based email addresses are not allowed",
                details: data
            };
        }
        
        return {
            isValid: true,
            details: data
        };
        
    } catch (error) {
        // If Mailboxlayer API fails, fall back to basic validation
        console.error('Mailboxlayer API error:', error);
        return {
            isValid: false,
            error: "Email verification service temporarily unavailable. Please try again later.",
            details: { apiError: error.message }
        };
    }
}

/**
 * Validates email format and domain MX records
 * @param {string} email - The email address to validate
 * @returns {Promise<{isValid: boolean, error?: string}>} - Validation result
 */
/**
 * Validates email format and domain MX records using Mailboxlayer API
 * @param {string} email - The email address to validate
 * @returns {Promise<{isValid: boolean, error?: string, details?: object}>} - Validation result
 */
async function validateEmail(email) {
    // First check basic format
    if (!isValidEmail(email)) {
        return {
            isValid: false,
            error: "Invalid email format"
        };
    }

    // Use Mailboxlayer API for comprehensive validation
    const mailboxlayerResult = await verifyEmailWithMailboxlayer(email);
    
    // If Mailboxlayer API fails, fall back to basic MX record check
    if (!mailboxlayerResult.isValid && mailboxlayerResult.details?.apiError) {
        console.warn('Falling back to basic MX validation due to API error');
        
        const domain = email.split('@')[1];
        const hasValidMx = await hasValidMxRecord(domain);
        
        if (!hasValidMx) {
            return {
                isValid: false,
                error: "Domain does not have valid mail server (MX record not found)"
            };
        }
        
        return {
            isValid: true,
            details: { fallbackValidation: true }
        };
    }
    
    return mailboxlayerResult;
}

export { isValidEmail, hasValidMxRecord, verifyEmailWithMailboxlayer, validateEmail };
