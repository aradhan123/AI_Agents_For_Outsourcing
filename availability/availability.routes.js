import express from "express";
import * as controller from "./availability.controller.js";

const router = express.Router();

router.get("/users/:userId", controller.getUserAvailability);
router.post("/check", controller.checkSlot);

export default router;

