import { Router } from "express";
import { getUserByToken } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.route("/me").get(getUserByToken);

export default userRouter;
