import { useEffect, useState } from "react";
import { CsvImport } from "./CsvImport";
type Tx = {
  id: string;
  date: string;
  name: string;
  amount: number;
  category?: string;
};

type Totals = {
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>;
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function parseMoneyInput(v: string) {
  const cleaned = v.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export default function App() {
  const [tx, setTx] = useState<Tx[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [isDark, setIsDark] = useState(true);

  const categories = Array.from(
    new Set(tx.map((t) => (t.category?.trim() ? t.category : "Uncategorized")))
  ).sort();

  const filteredTx =
    categoryFilter === "All"
      ? tx
      : tx.filter((t) => (t.category?.trim() ? t.category : "Uncategorized") === categoryFilter);

  async function refreshTransactions() {
    const res = await fetch("http://localhost:3001/transactions");
    const data = await res.json();
    setTx(data);
  }

  async function refreshTotals() {
    setLoadingTotals(true);
    try {
      const res = await fetch("http://localhost:3001/insights/totals");
      const data = await res.json();
      setTotals(data);
    } finally {
      setLoadingTotals(false);
    }
  }

  async function resetAll() {
    await fetch("http://localhost:3001/reset", { method: "POST" });
    setIncomeOverride(null);
    await refreshAll();
  }

  async function refreshAll() {
    await Promise.all([refreshTransactions(), refreshTotals()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const topCategories =
    totals?.byCategory
      ? Object.entries(totals.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
      : [];

  const displayIncome = totals ? incomeOverride ?? totals.income : 0;
  const displayExpenses = totals ? totals.expenses : 0;
  const displayNet = totals ? displayIncome - displayExpenses : 0;

  const theme = {
    bg: isDark ? "#1e293b" : "#f8fafc",
    card: isDark ? "#334155" : "white",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    headerText: isDark ? "#f1f5f9" : "#1e293b",
    headerSubtext: isDark ? "#cbd5e1" : "#64748b",
    buttonBg: isDark ? "#475569" : "#e2e8f0",
    buttonBgHover: isDark ? "#64748b" : "#cbd5e1",
    buttonText: isDark ? "#f1f5f9" : "#1e293b",
    border: isDark ? "#475569" : "#e2e8f0",
    inputBg: isDark ? "#475569" : "#ffffff",
    tableBorder: isDark ? "#475569" : "#f1f5f9",
    categoryBg: isDark ? "#475569" : "#f1f5f9",
    barBg: isDark ? "#475569" : "#f1f5f9",
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, color: theme.headerText, fontSize: 36, fontWeight: 700 }}>
              Finance Robot 🤖
            </h1>
            <p style={{ margin: "8px 0 0 0", color: theme.headerSubtext, fontSize: 16 }}>
              Track and analyze your finances
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: theme.buttonBg,
                color: theme.buttonText,
                cursor: "pointer",
                fontSize: 20,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.buttonBgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = theme.buttonBg}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={resetAll}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                background: theme.buttonBg,
                color: theme.buttonText,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.buttonBgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = theme.buttonBg}
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* CSV Import Section */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          marginTop: 32,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600, color: theme.text }}>
            Import CSV
          </h3>
          <CsvImport onImported={refreshAll} />
        </div>

        {/* Financial Overview Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: 20, 
          marginTop: 32 
        }}>
          {/* Income Card */}
          <div style={{ 
            background: theme.card, 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600, marginBottom: 12 }}>
              INCOME
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981", marginBottom: 16 }}>
              {totals ? money(displayIncome) : loadingTotals ? "Loading..." : "—"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Override income..."
                inputMode="decimal"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  fontSize: 14,
                  background: theme.inputBg,
                  color: theme.text,
                }}
                value={incomeOverride === null ? "" : String(incomeOverride)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v.trim()) {
                    setIncomeOverride(null);
                    return;
                  }
                  const n = parseMoneyInput(v);
                  if (!Number.isNaN(n)) setIncomeOverride(n);
                }}
              />
              <button
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: incomeOverride === null ? (isDark ? "#64748b" : "#f1f5f9") : "#667eea",
                  color: incomeOverride === null ? (isDark ? "#cbd5e1" : "#94a3b8") : "white",
                  cursor: incomeOverride === null ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
                onClick={() => setIncomeOverride(null)}
                disabled={incomeOverride === null}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Expenses Card */}
          <div style={{ 
            background: theme.card, 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600, marginBottom: 12 }}>
              EXPENSES
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#ef4444" }}>
              {totals ? money(displayExpenses) : loadingTotals ? "Loading..." : "—"}
            </div>
          </div>

          {/* Net Card */}
          <div style={{ 
            background: theme.card, 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 14, color: theme.textMuted, fontWeight: 600, marginBottom: 12 }}>
              NET BALANCE
            </div>
            <div style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              color: displayNet >= 0 ? "#10b981" : "#ef4444" 
            }}>
              {totals ? money(displayNet) : loadingTotals ? "Loading..." : "—"}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 2fr", 
          gap: 20, 
          marginTop: 32 
        }}>
          {/* Top Categories */}
          <div style={{ 
            background: theme.card, 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: theme.text }}>
              Top Categories
            </h2>
            {!totals ? (
              <div style={{ color: theme.textMuted, fontSize: 14 }}>
                {loadingTotals ? "Loading..." : "No data yet"}
              </div>
            ) : topCategories.length === 0 ? (
              <div style={{ color: theme.textMuted, fontSize: 14 }}>No categories found</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topCategories.map(([cat, amt]) => (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{cat}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#667eea" }}>
                        {money(amt)}
                      </span>
                    </div>
                    <div style={{ 
                      height: 6, 
                      background: theme.barBg, 
                      borderRadius: 3,
                      overflow: "hidden"
                    }}>
                      <div style={{ 
                        height: "100%", 
                        background: "linear-gradient(90deg, #667eea, #764ba2)",
                        width: `${(amt / (topCategories[0]?.[1] || 1)) * 100}%`,
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div style={{ 
            background: theme.card, 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Transactions</h2>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: theme.textMuted }}>
                  {filteredTx.length} of {tx.length}
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    fontSize: 14,
                    cursor: "pointer",
                    background: theme.inputBg,
                    color: theme.text,
                  }}
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {filteredTx.length === 0 ? (
                <div style={{ color: theme.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>
                  No transactions found
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: theme.card }}>
                    <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                      <th style={{ textAlign: "left", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: theme.textMuted }}>DATE</th>
                      <th style={{ textAlign: "left", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: theme.textMuted }}>NAME</th>
                      <th style={{ textAlign: "left", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: theme.textMuted }}>CATEGORY</th>
                      <th style={{ textAlign: "right", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: theme.textMuted }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((t) => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${theme.tableBorder}` }}>
                        <td style={{ padding: "12px 8px", fontSize: 14, color: theme.textMuted }}>{t.date}</td>
                        <td style={{ padding: "12px 8px", fontSize: 14, fontWeight: 500, color: theme.text }}>{t.name}</td>
                        <td style={{ padding: "12px 8px", fontSize: 14 }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: theme.categoryBg,
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                          }}>
                            {t.category?.trim() ? t.category : "Uncategorized"}
                          </span>
                        </td>
                        <td style={{ 
                          padding: "12px 8px", 
                          fontSize: 14, 
                          fontWeight: 600,
                          textAlign: "right",
                          color: t.amount < 0 ? "#ef4444" : "#10b981"
                        }}>
                          {money(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}