import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import { publicDiscountsRouter, adminDiscountsRouter } from "./discounts";
import posRouter from "./pos";
import { adminOffersRouter, publicOffersRouter } from "./offers";
import { suppliersRouter } from "./suppliers";
import { paymentMethodsRouter } from "./payment-methods";
import { purchasesRouter } from "./purchases";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/discounts", publicDiscountsRouter);
router.use("/offers", publicOffersRouter);
router.use("/admin/discounts", adminDiscountsRouter);
router.use("/admin/offers", adminOffersRouter);
router.use("/admin/pos", posRouter);
router.use("/admin/suppliers", suppliersRouter);
router.use("/admin/payment-methods", paymentMethodsRouter);
router.use("/admin/purchases", purchasesRouter);
router.use("/admin", adminRouter);

export default router;
