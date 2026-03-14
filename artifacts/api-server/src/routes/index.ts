import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import { publicDiscountsRouter, adminDiscountsRouter } from "./discounts";
import posRouter from "./pos";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/discounts", publicDiscountsRouter);
router.use("/admin/discounts", adminDiscountsRouter);
router.use("/admin/pos", posRouter);
router.use("/admin", adminRouter);

export default router;
