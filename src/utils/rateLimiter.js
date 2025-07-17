import rateLimit from 'express-rate-limit';

// Rate limiter for newsletter subscription - 2 requests per minute
const newsletterRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2, // limit each IP to 2 requests per windowMs
    message: {
        error: 'Too many newsletter subscription attempts, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many newsletter subscription attempts, please try again later.',
            retryAfter: '1 minute'
        });
    }
});

export { newsletterRateLimit };
