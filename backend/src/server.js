import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { asyncHandler, dateRange } from "./utils.js";
import { query, sql } from "./db.js";
import { queries } from "./queries.js";

dotenv.config();

const app = express();
const port = Number(process.env.BACKEND_PORT || 4000);

app.use(cors());
app.use(express.json());

function rangeInputs(req) {
  const { startDate, endDate } = dateRange(req);
  return {
    startDate: { type: sql.DateTime, value: new Date(`${startDate}T00:00:00`) },
    endDate: {
      type: sql.DateTime,
      value: endDate ? new Date(`${endDate}T00:00:00`) : null,
    },
  };
}

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    const [health] = await query(queries.health);
    res.json({ ok: true, health });
  }),
);

app.get(
  "/api/schema/tables",
  asyncHandler(async (_req, res) => {
    res.json({ tables: await query(queries.tableSummary) });
  }),
);

app.get(
  "/api/reports/kpis",
  asyncHandler(async (req, res) => {
    const [kpis] = await query(queries.kpis, rangeInputs(req));
    res.json({ kpis });
  }),
);

app.get(
  "/api/reports/monthly-sales",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.monthlySales, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/top-products",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.topProducts, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/salespeople",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.salespeople, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/payment-methods",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.paymentMethods, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/customers",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.customers, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/inventory",
  asyncHandler(async (_req, res) => {
    res.json({ rows: await query(queries.inventory) });
  }),
);

app.get(
  "/api/reports/categories",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.categories, rangeInputs(req)) });
  }),
);

app.get(
  "/api/reports/customer-retention",
  asyncHandler(async (req, res) => {
    const [retention] = await query(queries.customerRetention, rangeInputs(req));
    res.json({ retention });
  }),
);

app.get(
  "/api/reports/stock-coverage",
  asyncHandler(async (_req, res) => {
    res.json({ rows: await query(queries.stockCoverage) });
  }),
);

app.get(
  "/api/reports/product-abc",
  asyncHandler(async (req, res) => {
    res.json({ rows: await query(queries.productAbc, rangeInputs(req)) });
  }),
);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "Erro ao consultar o WishBI",
    detail: error.message,
  });
});

app.listen(port, () => {
  console.log(`Wish BI API ouvindo em http://localhost:${port}`);
});
