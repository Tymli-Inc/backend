import sql from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { validateEmail } from "../utils/emailValidator.js";
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

const subscribeToNewsletter = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new ApiError(400, "Email is required");
        }

        // Validate email format and MX record
        const validation = await validateEmail(email);
        if (!validation.isValid) {
            throw new ApiError(400, validation.error);
        }
        
        // Insert the email into the newsletter table
        await sql`INSERT INTO newsletter (email) VALUES (${email})`;
        
        // Add subscriber to Resend audience
        try {
            await resend.contacts.create({
                email: email,
                audienceId: process.env.RESEND_AUDIENCE_ID,
            });
            
            console.log(`Successfully added ${email} to Resend audience`);
        } catch (resendError) {
            console.error('Failed to add subscriber to Resend audience:', resendError);
            // Don't fail the whole request if Resend fails, just log it
            // The email is still stored in your database
        }
        
        res.status(201).json(new ApiResponse(201, { email }, "Email subscribed successfully"));
    } catch (error) {
        // Handle unique constraint violation (if email already exists)
        if (error.code === '23505') {
            // If email already exists in database, try to add to Resend anyway
            // (in case it was added to DB but not to Resend previously)
            try {
                await resend.contacts.create({
                    email: req.body.email,
                    audienceId: process.env.RESEND_AUDIENCE_ID,
                });
                console.log(`Added existing email ${req.body.email} to Resend audience`);
            } catch (resendError) {
                // Ignore Resend errors for duplicate emails
                console.log('Email already exists in Resend or other Resend error:', resendError.message);
            }
            
            throw new ApiError(409, "Email already subscribed");
        }
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
        } else {
            res.status(500).json(new ApiResponse(500, null, "Internal server error"));
        }
    }
});

export { subscribeToNewsletter };
