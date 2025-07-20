// very important fuction 
// use it to get the user ID from tokens
import sql from "../database/db.js";

const getUserId = async (token) => {
    const tokens = await sql`
        SELECT user_id FROM tokens WHERE token = ${token}
    `;
    return tokens.length > 0 ? tokens[0].user_id : null;
}

export { getUserId };