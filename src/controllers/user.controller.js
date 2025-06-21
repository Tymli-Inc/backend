import sql from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getUserByToken = asyncHandler(async (req, res) => {
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
        SELECT id, name, email FROM users WHERE id = ${tokens[0].user_id}
    `;
    if (userResult.length === 0) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json(new ApiResponse(200, userResult[0], "User fetched successfully"));
});

export { getUserByToken };
