import express from "express";
import cors from "cors";
import multer from "multer";
import { parse } from "csv-parse";
import crypto from "node:crypto";

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   Types
========================= */

type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  amount: number; // +income, -expense
  category: string;
};

/* =========================
   Helpers
========================= */

function categorize(name: string, amount: number): string {
  if (!name.trim()) return "Uncategorized";

  const n = name.toLowerCase();

  if (amount > 0) return "Income";
  if (n.includes("rent")) return "Housing";
  if (n.includes("grocery") || n.includes("supermarket") || n.includes("trader") || n.includes("whole foods"))
    return "Groceries";
  if (n.includes("gas") || n.includes("shell") || n.includes("exxon") || n.includes("bp")) return "Gas";
  if (n.includes("uber") || n.includes("lyft") || n.includes("taxi")) return "Transport";
  if (n.includes("netflix") || n.includes("spotify") || n.includes("hulu") || n.includes("disney"))
    return "Subscriptions";
  if (n.includes("electric") || n.includes("utility") || n.includes("water") || n.includes("coned") || n.includes("pseg"))
    return "Utilities";
  if (n.includes("internet") || n.includes("verizon") || n.includes("optimum") || n.includes("comcast"))
    return "Internet";
  if (n.includes("coffee") || n.includes("starbucks") || n.includes("dunkin")) return "Coffee";
  if (n.includes("chipotle") || n.includes("mcdonald") || n.includes("restaurant") || n.includes("pizza"))
    return "Dining";

  return "Uncategorized";
}

function normalizeAmount(raw: string) {
  const s = String(raw).trim();
  const neg = s.startsWith("(") && s.endsWith(")");
  const cleaned = s.replace(/[,$()]/g, "");
  const n = Number(cleaned);
  return neg ? -n : n;
}

/* =========================
   In-Memory Store (TEMP)
========================= */

let transactions: Transaction[] = [];

/* =========================
   Routes
========================= */

app.get("/", (_req, res) => {
  res.type("text").send("Finance Robot API is running ✅ Try /health");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/insights/totals", (_req, res) => {
    let income = 0;
    let expenses = 0;
  
    const byCategory: Record<string, number> = {};
  
    for (const t of transactions) {
      const cat = t.category || "Uncategorized";
  
      if (t.amount > 0) income += t.amount;
      else {
        const spend = Math.abs(t.amount);
        expenses += spend;
        byCategory[cat] = (byCategory[cat] || 0) + spend;
      }
    }
  
    const net = income - expenses;
  
    res.json({ income, expenses, net, byCategory });
  });
  

app.get("/transactions", (_req, res) => {
  res.json(transactions);
});

/* =========================
   Manual Add Transaction
========================= */

app.post("/transactions", (req, res) => {
  const { date, name, amount } = req.body as {
    date: string;
    name: string;
    amount: number | string;
  };

  const cleanName = String(name ?? "").trim();
  const amountNum = Number(amount);

  const tx: Transaction = {
    id: crypto.randomUUID(),
    date: String(date).slice(0, 10),
    name: cleanName || "(No description)",
    amount: amountNum,
    category: cleanName ? categorize(cleanName, amountNum) : "Uncategorized",
  };

  transactions.push(tx);
  res.json(tx);
});

/* =========================
   Reset | Start Fresh
========================= */
app.post("/reset", (_req, res) => {
  // clear in-memory data
  transactions = [];
  res.json({ ok: true });
});




/* =========================
   CSV Import
========================= */

const upload = multer({ storage: multer.memoryStorage() });

app.post("/transactions/import/csv", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file field 'file'" });
    }
  
    const csvText = req.file.buffer.toString("utf8");
    const imported: Transaction[] = [];
  
    parse(
      csvText,
      { columns: true, skip_empty_lines: true, trim: true },
      (err, rows: any[]) => {
        if (err) {
          return res.status(400).json({ error: "CSV parse error", detail: String(err) });
        }
  
        for (const r of rows) {
          const date =
            r.date ||
            r.Date ||
            r.TransactionDate ||
            r["Transaction Date"] ||
            r["Trans. Date"]; // Discover
  
          const rawName =
            r.name ||
            r.Description ||
            r.Name ||
            r.Merchant ||
            r["Merchant Name"]; // Discover uses Description too, but you already have r.Description above
  
          const amountRaw =
            r.amount ||
            r.Amount ||
            r["Transaction Amount"] ||
            r["Amount (USD)"] ||
            r["Amount"]; // Discover
  
          const bankCategory = r.Category || r["Category"]; // Discover
  
          if (!date || amountRaw === undefined) continue;
  
          const cleanName = String(rawName ?? "").trim();
          const amountNum = normalizeAmount(String(amountRaw));
  
          const looksLikeCredit =
            /payment|credit|refund|returned|return/i.test(cleanName) ||
            String(bankCategory ?? "").toLowerCase().includes("payment") ||
            String(bankCategory ?? "").toLowerCase().includes("credit");
  
          const signedAmount = looksLikeCredit ? Math.abs(amountNum) : -Math.abs(amountNum);
  
          const cleanBankCategory = String(bankCategory ?? "").trim();
          const category = cleanBankCategory
            ? cleanBankCategory
            : cleanName
            ? categorize(cleanName, signedAmount)
            : "Uncategorized";
  
          const tx: Transaction = {
            id: crypto.randomUUID(),
            date: String(date).slice(0, 10),
            name: cleanName || "(No description)",
            amount: signedAmount,
            category,
          };
  
          transactions.push(tx);
          imported.push(tx);
        }
  
        return res.json({
          imported: imported.length,
          sample: imported.slice(0, 5),
        });
      }
    );
  });
  

/* =========================
   Insights
========================= */

app.get("/insights/summary", (_req, res) => {
  let income = 0;
  let expenses = 0;

  for (const t of transactions) {
    if (t.amount > 0) income += t.amount;
    else expenses += Math.abs(t.amount);
  }

  const net = income - expenses;
  const savingsRate = income > 0 ? net / income : 0;

  res.json({ income, expenses, net, savingsRate });
});

app.get("/insights/advice", (_req, res) => {
  let income = 0;
  let expenses = 0;

  for (const t of transactions) {
    if (t.amount > 0) income += t.amount;
    else expenses += Math.abs(t.amount);
  }

  const net = income - expenses;
  const savingsRate = income > 0 ? net / income : 0;

  const advice: Array<{
    title: string;
    detail: string;
    severity: "info" | "warn" | "urgent";
  }> = [];

  if (net < 0) {
    advice.push({
      title: "Spending exceeds income",
      detail: `You're down $${Math.abs(net).toFixed(2)}. Start by cutting 1–2 categories.`,
      severity: "urgent",
    });
  }

  if (income > 0 && savingsRate < 0.1) {
    advice.push({
      title: "Low savings rate",
      detail: `Savings rate is ${(savingsRate * 100).toFixed(1)}%. Try automating 10%.`,
      severity: "warn",
    });
  }

  if (advice.length === 0) {
    advice.push({
      title: "You're on track",
      detail: "Cash flow looks healthy. Next step: build a 3–6 month emergency fund.",
      severity: "info",
    });
  }

  res.json(advice);
});

/* =========================
   Start Server
========================= */

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
