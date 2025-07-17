import sql from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { validateEmail } from "../utils/emailValidator.js";

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
        
        res.status(201).json(new ApiResponse(201, { email }, "Email subscribed successfully"));
    } catch (error) {
        // Handle unique constraint violation (if email already exists)
        if (error.code === '23505') {
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
