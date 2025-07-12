import { Router } from "express";
import { getUserByToken,isInfoAvailable,storeUserInfo,fetchStoredInfo } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.route("/me").get(getUserByToken);
userRouter.route("/info/available").post(isInfoAvailable);
userRouter.route("/info/store").post(storeUserInfo);
userRouter.route("/info/fetch").post(fetchStoredInfo);

export default userRouter;
