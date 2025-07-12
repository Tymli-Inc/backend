import sql from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getUserByToken = asyncHandler(async (req, res) => {
    try {
        const authHeader = req.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "Authorization header missing or malformed");
        }
        const token = authHeader.split(" ")[1];
        const tokens = await sql`
            SELECT user_id FROM tokens WHERE token = ${token}
        `;
        if (tokens.length === 0) {
            throw new ApiError(401, "Invalid token");
        }
        const userResult = await sql`
            SELECT id, name, email, image FROM users WHERE id = ${tokens[0].user_id}
        `;
        if (userResult.length === 0) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json(new ApiResponse(200, userResult[0], "User fetched successfully"));
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
        } else {
            res.status(500).json(new ApiResponse(500, null, "Internal server error"));
        }
    }
});

const isInfoAvailable = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            throw new ApiError(400, "userId is required");
        }
        const userResult = await sql`
            SELECT user_id FROM info WHERE user_id = ${userId}`;
        if (userResult.length > 0) {
            res.status(200).json(new ApiResponse(200, { available: true }, "Info is available for user"));
        } else {
            res.status(200).json(new ApiResponse(200, { available: false }, "Info is not available for user"));
        }
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
        } else {
            res.status(500).json(new ApiResponse(500, null, "Internal server error"));
        }
    }
});

const storeUserInfo = asyncHandler(async (req, res) => {
    try {
        // Log the incoming request body for debugging
        console.log('Received request body:', JSON.stringify(req.body, null, 2));
        
        const { 
            userId, 
            name, 
            job_role, 
            referralSource,
            team_mode, 
            work_type, 
            daily_work_hours, 
            distraction_apps, 
            distraction_content_types, 
            distraction_time, 
            productivity_goal,
            enforcement_preference
        } = req.body;
        
        // Detailed validation with specific error messages
        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!name) missingFields.push('name');
        if (!job_role) missingFields.push('job_role');
        if (!referralSource) missingFields.push('referralSource');
        if (!team_mode) missingFields.push('team_mode');
        if (!work_type) missingFields.push('work_type');
        if (!daily_work_hours) missingFields.push('daily_work_hours');
        if (!distraction_apps) missingFields.push('distraction_apps');
        if (!distraction_content_types) missingFields.push('distraction_content_types');
        if (!distraction_time) missingFields.push('distraction_time');
        if (!productivity_goal) missingFields.push('productivity_goal');
        if (!enforcement_preference) missingFields.push('enforcement_preference');
        
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Log the data we're about to insert
        console.log('Inserting data:', {
            userId, name, job_role, referralSource, team_mode, work_type, 
            daily_work_hours, distraction_apps, distraction_content_types, 
            distraction_time, productivity_goal, enforcement_preference
        });
        
        // Fixed SQL query with proper column names and values
        const result = await sql`
            INSERT INTO info (
                user_id, 
                name, 
                job_role, 
                referral_source, 
                team_mode, 
                work_type, 
                daily_work_hours, 
                distraction_apps, 
                distraction_content_types, 
                distraction_time, 
                productivity_goal, 
                enforcement_preference
            )
            VALUES (
                ${userId}, 
                ${name}, 
                ${job_role}, 
                ${referralSource}, 
                ${team_mode}, 
                ${work_type}, 
                ${daily_work_hours}, 
                ${distraction_apps}, 
                ${distraction_content_types}, 
                ${distraction_time}, 
                ${productivity_goal}, 
                ${enforcement_preference}
            )
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name,
                job_role = EXCLUDED.job_role,
                referral_source = EXCLUDED.referral_source,
                team_mode = EXCLUDED.team_mode,
                work_type = EXCLUDED.work_type,
                daily_work_hours = EXCLUDED.daily_work_hours,
                distraction_apps = EXCLUDED.distraction_apps,
                distraction_content_types = EXCLUDED.distraction_content_types,
                distraction_time = EXCLUDED.distraction_time,
                productivity_goal = EXCLUDED.productivity_goal,
                enforcement_preference = EXCLUDED.enforcement_preference
        `;
        
        console.log('Insert result:', result);
        res.status(200).json(new ApiResponse(200, { success: true }, "User info stored successfully"));
        
    } catch (error) {
        console.error('Detailed error in storeUserInfo:', error);
        console.error('Error stack:', error.stack);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
        } else {
            // Return more detailed error information
            res.status(500).json(new ApiResponse(500, null, `Database error: ${error.message}`));
        }
    }
});

const fetchStoredInfo = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            throw new ApiError(400, "userId is required");
        }
        const infoResult = await sql`
            SELECT * FROM info WHERE user_id = ${userId}
        `;
        if (infoResult.length === 0) {
            throw new ApiError(404, "No info found for the user");
        }
        res.status(200).json(new ApiResponse(200, infoResult[0], "User info fetched successfully"));
    } catch (error) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
        } else {
            res.status(500).json(new ApiResponse(500, null, "Internal server error"));
        }
    }
});

export { getUserByToken, isInfoAvailable, storeUserInfo, fetchStoredInfo };