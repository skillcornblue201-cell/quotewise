import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ---------------------------------------------------------------
   QuoteWise MVP
   Scope: pricing calculator + quote generator only.
   Palette: workshop ledger — parchment paper, ink, workshop green,
   brass (premium), brick (break-even/caution).
   Signature element: the "build-up bar" — the price is physically
   constructed in front of you, layer by layer, like a job itself.
------------------------------------------------------------------*/

const COLORS = {
  paper: "#EFEBE1",
  paperDeep: "#E4DECD",
  card: "#FFFCF6",
  ink: "#20241F",
  inkSoft: "#5B6058",
  inkFaint: "#8B8F84",
  line: "#D9D2BE",
  green: "#2E6B4B",
  greenDeep: "#1E4A34",
  greenPale: "#DCE8DE",
  brass: "#B5872C",
  brassPale: "#F0E3C4",
  brick: "#A8432E",
  brickPale: "#F2DCD4",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
`;

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function emptyJob() {
  return {
    id: null,
    name: "",
    description: "",
    customerName: "",
    customerContact: "",
    materials: [{ id: uid(), name: "", cost: "" }],
    hours: "",
    hourlyRate: "",
    travel: "",
    delivery: "",
    equipment: "",
    subcontractor: "",
    otherCost: "",
    overheadPct: "0",
    contingencyPct: "10",
    taxPct: "",
  };
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function calc(job, settings) {
  const materialsTotal = job.materials.reduce((s, m) => s + num(m.cost), 0);
  const directCosts =
    materialsTotal +
    num(job.travel) +
    num(job.delivery) +
    num(job.equipment) +
    num(job.subcontractor) +
    num(job.otherCost);
  const hours = num(job.hours);
  const hourlyRate = num(job.hourlyRate);
  const labourValue = hours * hourlyRate;
  const baseCost = directCosts + labourValue;
  const overheadAlloc = baseCost * (num(job.overheadPct) / 100);
  const contingencyAlloc = baseCost * (num(job.contingencyPct) / 100);
  const trueCost = baseCost + overheadAlloc + contingencyAlloc;

  // Price so that profit / price === target margin (not a cost-plus markup):
  // price = cost / (1 - margin). Clamp so a 100%+ margin can't divide by zero/negative.
  const priceForMargin = (marginPct) => {
    const m = Math.min(Math.max(num(marginPct), 0), 95) / 100;
    return trueCost / (1 - m);
  };

  const breakEven = trueCost;
  const fairPrice = priceForMargin(settings.fairMargin);
  const premiumPrice = priceForMargin(settings.premiumMargin);

  const otherEstimatedCosts = trueCost - labourValue;

  const taxAmount = job.taxPct ? fairPrice * (num(job.taxPct) / 100) : 0;

  return {
    materialsTotal,
    directCosts,
    labourValue,
    baseCost,
    overheadAlloc,
    contingencyAlloc,
    trueCost,
    otherEstimatedCosts,
    breakEven,
    fairPrice,
    premiumPrice,
    hours,
    taxAmount,
  };
}

/* ------------------------------ Demo mode ------------------------------
   Seeds realistic sample data so someone can explore the whole flow
   without typing anything. Demo data is never written to persistent
   storage — entering demo snapshots the real data, exiting restores it. */

const DEMO_SETTINGS = { fairMargin: 20, premiumMargin: 35, currencySymbol: "£", defaultHourlyRate: "22" };

const DEMO_PROFILE = {
  businessName: "Riverside Garden Co.",
  contact: "07700 900123 · hello@riversidegarden.example",
  defaultTerms: "50% deposit to confirm, balance due on completion.",
};

function buildDemoJobs() {
  const specs = [
    {
      name: "Build 6ft garden planter",
      description: "Cedar planter with trellis, delivered and assembled on site.",
      customerName: "M. Alvarez",
      customerContact: "07700 900456",
      materials: [
        { id: uid(), name: "Timber", cost: "40" },
        { id: uid(), name: "Screws", cost: "8" },
        { id: uid(), name: "Wood treatment", cost: "12" },
        { id: uid(), name: "Packaging", cost: "5" },
      ],
      hours: "5",
      hourlyRate: "22",
      travel: "10",
      delivery: "",
      equipment: "",
      subcontractor: "",
      otherCost: "",
      overheadPct: "8",
      contingencyPct: "10",
      taxPct: "20",
      status: "Paid",
      daysAgo: 18,
    },
    {
      name: "Weekly lawn & border tidy",
      description: "Mowing, edging and a border tidy, recurring client.",
      customerName: "D. Whitfield",
      customerContact: "d.whitfield@example.com",
      materials: [{ id: uid(), name: "Bin bags & fuel", cost: "6" }],
      hours: "2.5",
      hourlyRate: "22",
      travel: "5",
      delivery: "",
      equipment: "",
      subcontractor: "",
      otherCost: "",
      overheadPct: "5",
      contingencyPct: "5",
      taxPct: "20",
      status: "Quote Sent",
      daysAgo: 3,
    },
    {
      name: "Fence panel repair (4 panels)",
      description: "Replace 4 storm-damaged fence panels and re-secure posts.",
      customerName: "R. Osei",
      customerContact: "07700 900789",
      materials: [
        { id: uid(), name: "Fence panels", cost: "120" },
        { id: uid(), name: "Post fixings", cost: "18" },
      ],
      hours: "6",
      hourlyRate: "22",
      travel: "15",
      delivery: "20",
      equipment: "",
      subcontractor: "",
      otherCost: "",
      overheadPct: "8",
      contingencyPct: "12",
      taxPct: "20",
      status: "Draft",
      daysAgo: 0,
    },
  ];

  return specs.map((spec) => {
    const job = { ...spec, id: uid(), date: addDays(-spec.daysAgo) };
    const result = calc(job, DEMO_SETTINGS);
    return { ...job, selectedPrice: result.fairPrice };
  });
}

function money(v, symbol) {
  const n = isFinite(v) ? v : 0;
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ---------------------------- storage ---------------------------- */

async function loadAll() {
  const out = { settings: null, profile: null, jobs: [] };
  try {
    const s = await window.storage.get("settings");
    if (s) out.settings = JSON.parse(s.value);
  } catch (e) {}
  try {
    const p = await window.storage.get("businessProfile");
    if (p) out.profile = JSON.parse(p.value);
  } catch (e) {}
  try {
    const j = await window.storage.get("savedJobs");
    if (j) out.jobs = JSON.parse(j.value);
  } catch (e) {}
  return out;
}

/* ------------------------------ UI bits ------------------------------ */

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div
        style={{
          fontFamily: "Inter",
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.inkSoft,
          marginBottom: 6,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && (
          <span style={{ fontWeight: 400, color: COLORS.inkFaint }}>{hint}</span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.line}`,
  background: "#fff",
  fontFamily: "Inter",
  fontSize: 15,
  color: COLORS.ink,
  outline: "none",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function NumInput(props) {
  return (
    <input
      {...props}
      inputMode="decimal"
      type="text"
      style={{
        ...inputStyle,
        fontFamily: "IBM Plex Mono",
        ...(props.style || {}),
      }}
    />
  );
}

function Button({ children, onClick, variant = "primary", style, disabled }) {
  const base = {
    fontFamily: "Space Grotesk",
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 18px",
    borderRadius: 9,
    border: "none",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    letterSpacing: 0.2,
  };
  const variants = {
    primary: { background: COLORS.green, color: "#fff" },
    dark: { background: COLORS.ink, color: COLORS.paper },
    ghost: {
      background: "transparent",
      color: COLORS.ink,
      border: `1px solid ${COLORS.line}`,
    },
    brass: { background: COLORS.brass, color: "#fff" },
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 18px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 40 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: COLORS.ink,
              padding: 4,
            }}
            aria-label="Back"
          >
            ←
          </button>
        )}
      </div>
      <div
        style={{
          fontFamily: "Space Grotesk",
          fontWeight: 600,
          fontSize: 16,
          color: COLORS.ink,
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 40, textAlign: "right" }}>{right}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Draft: { bg: COLORS.paperDeep, fg: COLORS.inkSoft },
    "Quote Sent": { bg: COLORS.brassPale, fg: "#8A6414" },
    Accepted: { bg: COLORS.greenPale, fg: COLORS.greenDeep },
    Complete: { bg: COLORS.greenPale, fg: COLORS.greenDeep },
    Paid: { bg: COLORS.green, fg: "#fff" },
  };
  const s = map[status] || map.Draft;
  return (
    <span
      style={{
        fontFamily: "Inter",
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        padding: "3px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

/* ------------------------------ Screens ------------------------------ */

function Home({ jobs, settings, onNewJob, onOpenJob, onProfile, onSaved, demoMode, onDemo }) {
  const recent = jobs.slice(0, 4);
  return (
    <div style={{ padding: "4px 18px 100px" }}>
      <div style={{ marginTop: 6, marginBottom: 26 }}>
        <div
          style={{
            fontFamily: "Space Grotesk",
            fontWeight: 700,
            fontSize: 28,
            color: COLORS.ink,
            letterSpacing: -0.3,
          }}
        >
          QuoteWise
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: COLORS.inkSoft,
            marginTop: 4,
          }}
        >
          Know your costs. Know your price.
        </div>
        {!demoMode && (
          <button
            onClick={onDemo}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              marginTop: 8,
              fontFamily: "Inter",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.green,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Try demo mode →
          </button>
        )}
      </div>

      <button
        onClick={onNewJob}
        style={{
          width: "100%",
          background: COLORS.green,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: "22px 20px",
          textAlign: "left",
          cursor: "pointer",
          marginBottom: 22,
          boxShadow: "0 6px 18px rgba(46,107,75,0.25)",
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk",
            fontWeight: 700,
            fontSize: 19,
          }}
        >
          + Price a job
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 13, opacity: 0.85, marginTop: 3 }}>
          Under 2 minutes to a number you can quote
        </div>
      </button>

      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <button
          onClick={onSaved}
          style={{
            flex: 1,
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "12px 10px",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 13,
            color: COLORS.ink,
            cursor: "pointer",
          }}
        >
          Saved jobs
        </button>
        <button
          onClick={onProfile}
          style={{
            flex: 1,
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "12px 10px",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 13,
            color: COLORS.ink,
            cursor: "pointer",
          }}
        >
          Business profile
        </button>
      </div>

      <div
        style={{
          fontFamily: "Inter",
          fontSize: 12,
          fontWeight: 700,
          color: COLORS.inkFaint,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 10,
        }}
      >
        Recent jobs
      </div>

      {recent.length === 0 && (
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: COLORS.inkFaint,
            padding: "18px 0",
          }}
        >
          Nothing priced yet — your first job will show up here.
        </div>
      )}

      {recent.map((j) => (
        <button
          key={j.id}
          onClick={() => onOpenJob(j)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "13px 14px",
            marginBottom: 8,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>
              {j.name || "Untitled job"}
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint, marginTop: 2 }}>
              {j.date}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: 15, color: COLORS.ink }}>
              {money(j.selectedPrice, settings.currencySymbol)}
            </div>
            <div style={{ marginTop: 4 }}>
              <StatusBadge status={j.status} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function MaterialsEditor({ materials, onChange }) {
  const update = (id, field, value) => {
    onChange(materials.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };
  const remove = (id) => onChange(materials.filter((m) => m.id !== id));
  const add = () => onChange([...materials, { id: uid(), name: "", cost: "" }]);
  return (
    <div>
      {materials.map((m, i) => (
        <div key={m.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <TextInput
            placeholder={`Material ${i + 1} (e.g. Timber)`}
            value={m.name}
            onChange={(e) => update(m.id, "name", e.target.value)}
            style={{ flex: 2 }}
          />
          <NumInput
            placeholder="Cost"
            value={m.cost}
            onChange={(e) => update(m.id, "cost", e.target.value)}
            style={{ flex: 1 }}
          />
          {materials.length > 1 && (
            <button
              onClick={() => remove(m.id)}
              aria-label="Remove"
              style={{
                background: "none",
                border: "none",
                color: COLORS.brick,
                fontSize: 18,
                cursor: "pointer",
                padding: "0 2px",
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        style={{
          background: "none",
          border: `1px dashed ${COLORS.line}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: 13,
          color: COLORS.green,
          cursor: "pointer",
          width: "100%",
        }}
      >
        + Add material
      </button>
    </div>
  );
}

function SectionLabel({ children, n }) {
  return (
    <div
      style={{
        fontFamily: "Inter",
        fontSize: 12,
        fontWeight: 700,
        color: COLORS.inkFaint,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        margin: "22px 0 12px",
      }}
    >
      {n ? `${n} · ` : ""}
      {children}
    </div>
  );
}

function JobForm({ initial, settings, onBack, onCalculate }) {
  const [job, setJob] = useState(initial);
  const [showOtherCosts, setShowOtherCosts] = useState(
    !!(initial.travel || initial.delivery || initial.equipment || initial.subcontractor || initial.otherCost)
  );
  const set = (field) => (e) => setJob({ ...job, [field]: e.target.value });

  const canCalc = job.name.trim().length > 0;

  return (
    <div style={{ padding: "0 18px 120px" }}>
      <TopBar title="Price a job" onBack={onBack} />

      <SectionLabel n="1">Job details</SectionLabel>
      <Field label="Job name">
        <TextInput
          placeholder="e.g. Build 6ft garden planter"
          value={job.name}
          onChange={set("name")}
          autoFocus
        />
      </Field>
      <Field label="Description" hint="optional">
        <TextInput placeholder="A little detail on the job" value={job.description} onChange={set("description")} />
      </Field>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Customer" hint="optional">
            <TextInput placeholder="Name" value={job.customerName} onChange={set("customerName")} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Contact" hint="optional">
            <TextInput placeholder="Phone or email" value={job.customerContact} onChange={set("customerContact")} />
          </Field>
        </div>
      </div>

      <SectionLabel n="2">Materials</SectionLabel>
      <MaterialsEditor materials={job.materials} onChange={(materials) => setJob({ ...job, materials })} />

      <SectionLabel n="3">Labour</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Estimated hours">
            <NumInput placeholder="5" value={job.hours} onChange={set("hours")} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={`Hourly rate (${settings.currencySymbol})`}>
            <NumInput placeholder="20" value={job.hourlyRate} onChange={set("hourlyRate")} />
          </Field>
        </div>
      </div>

      <SectionLabel n="4">Other costs</SectionLabel>
      {!showOtherCosts ? (
        <button
          onClick={() => setShowOtherCosts(true)}
          style={{
            background: "none",
            border: `1px dashed ${COLORS.line}`,
            borderRadius: 8,
            padding: "9px 12px",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 13,
            color: COLORS.green,
            cursor: "pointer",
            width: "100%",
          }}
        >
          + Add travel, delivery, equipment or subcontractor costs
        </button>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Travel">
            <NumInput value={job.travel} onChange={set("travel")} placeholder="0" />
          </Field>
          <Field label="Delivery">
            <NumInput value={job.delivery} onChange={set("delivery")} placeholder="0" />
          </Field>
          <Field label="Equipment">
            <NumInput value={job.equipment} onChange={set("equipment")} placeholder="0" />
          </Field>
          <Field label="Subcontractor">
            <NumInput value={job.subcontractor} onChange={set("subcontractor")} placeholder="0" />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Other">
              <NumInput value={job.otherCost} onChange={set("otherCost")} placeholder="0" />
            </Field>
          </div>
        </div>
      )}

      <SectionLabel n="5">Overheads &amp; contingency</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Overhead %" hint="insurance, tools, van...">
            <NumInput value={job.overheadPct} onChange={set("overheadPct")} placeholder="0" />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Contingency %" hint="waste, surprises">
            <NumInput value={job.contingencyPct} onChange={set("contingencyPct")} placeholder="10" />
          </Field>
        </div>
      </div>

      <SectionLabel n="6">Tax reserve</SectionLabel>
      <Field label="Personal tax reserve %" hint="optional · planning only, not tax advice">
        <NumInput value={job.taxPct} onChange={set("taxPct")} placeholder="e.g. 20" />
      </Field>

      <div style={{ marginTop: 18 }}>
        <Button
          disabled={!canCalc}
          onClick={() => onCalculate(job)}
          style={{ width: "100%" }}
        >
          Calculate price →
        </Button>
      </div>
    </div>
  );
}

function BuildBar({ result, settings, price }) {
  const segments = [
    { label: "Direct costs", value: result.directCosts, color: COLORS.inkSoft },
    { label: "Labour", value: result.labourValue, color: COLORS.green },
    { label: "Overhead", value: result.overheadAlloc, color: COLORS.brass },
    { label: "Contingency", value: result.contingencyAlloc, color: "#8A6414" },
  ].filter((s) => s.value > 0.004);

  const total = Math.max(price, result.premiumPrice, 1);
  const profit = Math.max(price - result.trueCost, 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 34,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        {segments.map((s, i) => (
          <div
            key={i}
            title={s.label}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              minWidth: s.value > 0 ? 2 : 0,
            }}
          />
        ))}
        <div
          style={{
            width: `${(profit / total) * 100}%`,
            background: COLORS.greenPale,
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(46,107,75,0.35) 0, rgba(46,107,75,0.35) 2px, transparent 2px, transparent 7px)",
          }}
          title="Profit"
        />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 14px",
          marginTop: 8,
        }}
      >
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
            <span style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.inkSoft }}>{s.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: COLORS.greenPale,
              border: `1px solid ${COLORS.green}`,
              display: "inline-block",
            }}
          />
          <span style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.inkSoft }}>Profit</span>
        </div>
      </div>
    </div>
  );
}

function TierCard({ label, value, sublabel, active, onClick, tone }) {
  const tones = {
    brick: { border: COLORS.brick, bg: active ? COLORS.brickPale : COLORS.card },
    green: { border: COLORS.green, bg: active ? COLORS.greenPale : COLORS.card },
    brass: { border: COLORS.brass, bg: active ? COLORS.brassPale : COLORS.card },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "left",
        padding: "12px 12px",
        borderRadius: 10,
        border: `1.5px solid ${active ? t.border : COLORS.line}`,
        background: t.bg,
        cursor: "pointer",
      }}
    >
      <div style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 700, color: COLORS.inkFaint, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: 16, color: COLORS.ink, marginTop: 3 }}>
        {value}
      </div>
      <div style={{ fontFamily: "Inter", fontSize: 10, color: COLORS.inkFaint, marginTop: 2 }}>{sublabel}</div>
    </button>
  );
}

function Results({ job, settings, onBack, onEdit, onSave, onQuote }) {
  const result = useMemo(() => calc(job, settings), [job, settings]);
  // When reopening a job that already has a chosen price, start there.
  // A brand-new or just-recalculated job has no selectedPrice yet, so it
  // starts at the fresh Fair Price for the current numbers.
  const startingPrice = job.selectedPrice != null ? job.selectedPrice : result.fairPrice;
  const [price, setPrice] = useState(startingPrice);

  useEffect(() => {
    setPrice(startingPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, job.selectedPrice]);

  const profit = price - result.trueCost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const effHourly = result.hours > 0 ? profit / result.hours : 0;

  const sliderMin = Math.max(result.breakEven * 0.6, 0);
  const sliderMax = result.premiumPrice * 1.35 || 100;

  const sym = settings.currencySymbol;

  let tierLabel = "Custom price";
  if (Math.abs(price - result.breakEven) < 0.5) tierLabel = "Break-even";
  else if (Math.abs(price - result.fairPrice) < 0.5) tierLabel = "Fair price";
  else if (Math.abs(price - result.premiumPrice) < 0.5) tierLabel = "Premium price";

  return (
    <div style={{ padding: "0 18px 130px" }}>
      <TopBar
        title={job.name || "Job"}
        onBack={onBack}
        right={
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              color: COLORS.green,
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Edit costs
          </button>
        }
      />

      <div style={{ textAlign: "center", margin: "14px 0 22px" }}>
        <div style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 700, color: COLORS.green, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {tierLabel}
        </div>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 46, color: COLORS.ink, lineHeight: 1.1 }}>
          {money(price, sym)}
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint }}>your price to the customer</div>
      </div>

      <BuildBar result={result} settings={settings} price={price} />

      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={0.5}
        value={price}
        onChange={(e) => setPrice(parseFloat(e.target.value))}
        style={{ width: "100%", marginTop: 16, accentColor: COLORS.green }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <TierCard
          label="Break-even"
          value={money(result.breakEven, sym)}
          sublabel="covers your cost only"
          tone="brick"
          active={Math.abs(price - result.breakEven) < 0.5}
          onClick={() => setPrice(result.breakEven)}
        />
        <TierCard
          label="Fair price"
          value={money(result.fairPrice, sym)}
          sublabel={`${settings.fairMargin}% margin`}
          tone="green"
          active={Math.abs(price - result.fairPrice) < 0.5}
          onClick={() => setPrice(result.fairPrice)}
        />
        <TierCard
          label="Premium"
          value={money(result.premiumPrice, sym)}
          sublabel={`${settings.premiumMargin}% margin`}
          tone="brass"
          active={Math.abs(price - result.premiumPrice) < 0.5}
          onClick={() => setPrice(result.premiumPrice)}
        />
      </div>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: "16px 16px",
          marginTop: 20,
        }}
      >
        {[
          ["Revenue at this price", money(price, sym)],
          ["Estimated true cost", money(result.trueCost, sym)],
          ["Estimated profit", money(profit, sym)],
          ["Profit margin", `${margin.toFixed(0)}%`],
          ["Profit per working hour", result.hours > 0 ? `${money(effHourly, sym)}/hr` : "—"],
        ].map(([label, value], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.paperDeep}`,
            }}
          >
            <span style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.inkSoft }}>{label}</span>
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{value}</span>
          </div>
        ))}

        <div style={{ height: 1, background: COLORS.paperDeep, margin: "10px 0" }} />
        <div style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 700, color: COLORS.inkFaint, textTransform: "uppercase", marginBottom: 4 }}>
          Where the money goes
        </div>
        {[
          ["Labour value", money(result.labourValue, sym)],
          ["Other estimated costs", money(result.otherEstimatedCosts, sym)],
          ["Additional profit", money(profit, sym)],
        ].map(([label, value], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.inkSoft }}>{label}</span>
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{value}</span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0 0",
            marginTop: 4,
            borderTop: `1px solid ${COLORS.paperDeep}`,
          }}
        >
          <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 700, color: COLORS.ink }}>
            Total return before tax
          </span>
          <span style={{ fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 700, color: COLORS.green }}>
            {money(result.labourValue + profit, sym)}
          </span>
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.inkFaint, marginTop: 4 }}>
          Your labour value plus additional profit, before any personal tax — not the same thing as your profit alone.
        </div>

        {job.taxPct ? (
          <div style={{ marginTop: 10, fontFamily: "Inter", fontSize: 11, color: COLORS.inkFaint }}>
            Personal reserve for tax at {job.taxPct}%: {money(result.taxAmount, sym)} — planning estimate only, not tax advice.
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Button variant="ghost" onClick={() => onSave(job, result, price, "Draft")} style={{ flex: 1 }}>
          Save job
        </Button>
        <Button onClick={() => onQuote(job, result, price)} style={{ flex: 1 }}>
          Create quote →
        </Button>
      </div>
    </div>
  );
}

function QuoteScreen({ job, result, price, settings, profile, onBack, onSent }) {
  const [customerName, setCustomerName] = useState(job.customerName || "");
  const [customerContact, setCustomerContact] = useState(job.customerContact || "");
  const [deposit, setDeposit] = useState("");
  const [completion, setCompletion] = useState("");
  const [expiry, setExpiry] = useState(addDays(14));
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(profile.defaultTerms || "Balance due on completion.");
  const [quoteNo] = useState(() => `Q-${Date.now().toString().slice(-6)}`);
  const [copyMsg, setCopyMsg] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [showManualCopy, setShowManualCopy] = useState(false);
  const manualRef = useRef(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (showManualCopy && manualRef.current) {
      manualRef.current.focus();
      manualRef.current.select();
    }
  }, [showManualCopy]);

  const sym = settings.currencySymbol;
  const depositAmt = num(deposit);
  const balance = Math.max(price - depositAmt, 0);

  const quoteText = [
    profile.businessName || "Your business",
    profile.contact ? profile.contact : null,
    "",
    `Quote ${quoteNo} — ${todayISO()}`,
    `For: ${customerName || "Customer"}`,
    "",
    job.name,
    job.description || null,
    "",
    `Price: ${money(price, sym)}`,
    depositAmt > 0 ? `Deposit required: ${money(depositAmt, sym)} (balance ${money(balance, sym)})` : null,
    completion ? `Estimated completion: ${completion}` : null,
    `Valid until: ${expiry}`,
    notes ? `\nNotes: ${notes}` : null,
    terms ? `\nTerms: ${terms}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Layered clipboard fallback: modern Clipboard API, then the legacy
  // execCommand approach (works in more embedded/sandboxed contexts),
  // then give up and let the caller reveal a selectable text box.
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
    } catch (e) {}
    return false;
  };

  const share = async () => {
    setCopyMsg("");
    if (canNativeShare) {
      try {
        await navigator.share({ title: `Quote ${quoteNo}`, text: quoteText });
        setShowManualCopy(false);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // user closed the share sheet — not an error
        // otherwise fall through and try to copy instead
      }
    }
    const ok = await copyText(quoteText);
    if (ok) {
      setShowManualCopy(false);
      setCopyMsg("Quote copied");
      setTimeout(() => setCopyMsg(""), 2500);
    } else {
      setShowManualCopy(true);
    }
  };

  return (
    <div style={{ padding: "0 18px 130px" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-print, #quote-print * { visibility: visible; }
          #quote-print { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <TopBar title="Create quote" onBack={onBack} />

      <div className="no-print">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="Customer">
              <TextInput value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Contact">
              <TextInput value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Phone or email" />
            </Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label={`Deposit (${sym})`} hint="optional">
              <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                {[
                  ["No deposit", 0],
                  ["25%", 25],
                  ["50%", 50],
                  ["75%", 75],
                ].map(([label, pct]) => {
                  const presetValue = pct === 0 ? "" : (price * pct / 100).toFixed(2);
                  const active = deposit === presetValue;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setDeposit(presetValue)}
                      style={{
                        fontFamily: "Inter",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "5px 9px",
                        borderRadius: 20,
                        border: `1px solid ${active ? COLORS.green : COLORS.line}`,
                        background: active ? COLORS.greenPale : "#fff",
                        color: active ? COLORS.greenDeep : COLORS.inkSoft,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
                <span
                  style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 9px",
                    borderRadius: 20,
                    border: `1px solid ${COLORS.line}`,
                    color: COLORS.inkFaint,
                  }}
                >
                  Custom below
                </span>
              </div>
              <NumInput value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Completion estimate" hint="optional">
              <TextInput value={completion} onChange={(e) => setCompletion(e.target.value)} placeholder="e.g. 3 days" />
            </Field>
          </div>
        </div>
        <Field label="Quote valid until">
          <TextInput type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </Field>
        <Field label="Notes" hint="optional">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else the customer should know" />
        </Field>
        <Field label="Terms">
          <TextInput value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
      </div>

      <SectionLabel>Preview</SectionLabel>

      <div
        id="quote-print"
        style={{
          background: "#fff",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 18, color: COLORS.ink }}>
              {profile.businessName || "Your business name"}
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint, marginTop: 2 }}>
              {profile.contact || "Add contact details in Business profile"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: COLORS.inkFaint }}>{quoteNo}</div>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: COLORS.inkFaint }}>{todayISO()}</div>
          </div>
        </div>

        <div style={{ height: 1, background: COLORS.paperDeep, margin: "16px 0" }} />

        <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint, textTransform: "uppercase", fontWeight: 700 }}>
          Quote for
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 15, color: COLORS.ink, marginTop: 2 }}>
          {customerName || "Customer name"}
        </div>
        {customerContact && (
          <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.inkFaint }}>{customerContact}</div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>
            {job.name}
          </div>
          {job.description && (
            <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
              {job.description}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 18,
            background: COLORS.paper,
            borderRadius: 10,
            padding: "16px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.inkFaint, textTransform: "uppercase", fontWeight: 700 }}>
            Total price
          </div>
          <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 32, color: COLORS.ink }}>
            {money(price, sym)}
          </div>
          {depositAmt > 0 && (
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>
              Deposit {money(depositAmt, sym)} · Balance {money(balance, sym)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint }}>
            {completion ? `Est. completion: ${completion}` : ""}
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint }}>Valid until {expiry}</div>
        </div>

        {notes && (
          <div style={{ marginTop: 14, fontFamily: "Inter", fontSize: 12, color: COLORS.inkSoft }}>
            <strong>Notes:</strong> {notes}
          </div>
        )}
        {terms && (
          <div style={{ marginTop: 6, fontFamily: "Inter", fontSize: 11, color: COLORS.inkFaint }}>
            <strong>Terms:</strong> {terms}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <Button variant="ghost" onClick={() => window.print()} style={{ flex: 1 }}>
          Print / Save as PDF
        </Button>
        <Button onClick={share} style={{ flex: 1 }}>
          {canNativeShare ? "Share quote" : "Copy quote"}
        </Button>
      </div>
      {copyMsg && (
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: "Inter", fontSize: 12, color: COLORS.green }}>
          {copyMsg}
        </div>
      )}
      {showManualCopy && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkSoft, marginBottom: 6 }}>
            Couldn't copy automatically — the text is selected below, so you can copy it with your keyboard or menu.
          </div>
          <textarea
            ref={manualRef}
            readOnly
            value={quoteText}
            rows={6}
            style={{
              ...inputStyle,
              fontFamily: "IBM Plex Mono",
              fontSize: 12,
              resize: "vertical",
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Button
          variant="dark"
          style={{ width: "100%" }}
          onClick={() =>
            onSent({
              job,
              result,
              price,
              customerName,
              customerContact,
              deposit: depositAmt,
              completion,
              expiry,
              notes,
              terms,
              quoteNo,
            })
          }
        >
          Mark as quote sent
        </Button>
      </div>
    </div>
  );
}

function SavedJobs({ jobs, settings, onBack, onOpen, onDelete }) {
  return (
    <div style={{ padding: "0 18px 100px" }}>
      <TopBar title="Saved jobs" onBack={onBack} />
      {jobs.length === 0 && (
        <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.inkFaint, padding: "18px 0" }}>
          No saved jobs yet.
        </div>
      )}
      {jobs.map((j) => (
        <div
          key={j.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "13px 14px",
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => onOpen(j)}
            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", flex: 1 }}
          >
            <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>
              {j.name || "Untitled job"}
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.inkFaint, marginTop: 2 }}>
              {j.date} {j.customerName ? `· ${j.customerName}` : ""}
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={j.status} />
            </div>
          </button>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: 15, color: COLORS.ink }}>
              {money(j.selectedPrice, settings.currencySymbol)}
            </div>
            <button
              onClick={() => onDelete(j.id)}
              style={{ background: "none", border: "none", color: COLORS.brick, fontSize: 12, cursor: "pointer", fontFamily: "Inter" }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Profile({ profile, settings, onBack, onSave }) {
  const [businessName, setBusinessName] = useState(profile.businessName || "");
  const [contact, setContact] = useState(profile.contact || "");
  const [defaultTerms, setDefaultTerms] = useState(profile.defaultTerms || "Balance due on completion.");
  const [fairMargin, setFairMargin] = useState(settings.fairMargin);
  const [premiumMargin, setPremiumMargin] = useState(settings.premiumMargin);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(settings.defaultHourlyRate || "");

  return (
    <div style={{ padding: "0 18px 120px" }}>
      <TopBar title="Business profile" onBack={onBack} />

      <SectionLabel>On your quotes</SectionLabel>
      <Field label="Business name">
        <TextInput value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Maple Garden Works" />
      </Field>
      <Field label="Contact" hint="phone / email, shown on quotes">
        <TextInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="07... · you@example.com" />
      </Field>
      <Field label="Default quote terms">
        <TextInput value={defaultTerms} onChange={(e) => setDefaultTerms(e.target.value)} />
      </Field>

      <SectionLabel>Pricing defaults</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Currency symbol">
            <TextInput value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Default hourly rate">
            <NumInput value={defaultHourlyRate} onChange={(e) => setDefaultHourlyRate(e.target.value)} placeholder="20" />
          </Field>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Fair price margin %">
            <NumInput value={fairMargin} onChange={(e) => setFairMargin(e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Premium price margin %">
            <NumInput value={premiumMargin} onChange={(e) => setPremiumMargin(e.target.value)} />
          </Field>
        </div>
      </div>

      <Button
        style={{ width: "100%", marginTop: 8 }}
        onClick={() =>
          onSave(
            { businessName, contact, defaultTerms },
            {
              fairMargin: num(fairMargin) || 20,
              premiumMargin: num(premiumMargin) || 35,
              currencySymbol: currencySymbol || "£",
              defaultHourlyRate,
            }
          )
        }
      >
        Save
      </Button>
    </div>
  );
}

/* ------------------------------ App ------------------------------ */

export default function App() {
  const [screen, setScreen] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    fairMargin: 20,
    premiumMargin: 35,
    currencySymbol: "£",
    defaultHourlyRate: "",
  });
  const [profile, setProfile] = useState({ businessName: "", contact: "", defaultTerms: "Balance due on completion." });
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [activePrice, setActivePrice] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [demoBackup, setDemoBackup] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await loadAll();
      if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
      if (data.profile) setProfile((p) => ({ ...p, ...data.profile }));
      if (data.jobs) setJobs(data.jobs);
      setLoaded(true);
    })();
  }, []);

  const persistJobs = useCallback(
    async (next) => {
      setJobs(next);
      if (demoMode) return; // demo edits are session-only, never saved
      try {
        await window.storage.set("savedJobs", JSON.stringify(next));
      } catch (e) {}
    },
    [demoMode]
  );

  const persistSettings = useCallback(
    async (next) => {
      setSettings(next);
      if (demoMode) return;
      try {
        await window.storage.set("settings", JSON.stringify(next));
      } catch (e) {}
    },
    [demoMode]
  );

  const persistProfile = useCallback(
    async (next) => {
      setProfile(next);
      if (demoMode) return;
      try {
        await window.storage.set("businessProfile", JSON.stringify(next));
      } catch (e) {}
    },
    [demoMode]
  );

  const enterDemo = () => {
    setDemoBackup({ jobs, profile, settings });
    setJobs(buildDemoJobs());
    setProfile(DEMO_PROFILE);
    setSettings(DEMO_SETTINGS);
    setDemoMode(true);
    setActiveJob(null);
    setScreen("home");
  };

  const exitDemo = () => {
    if (demoBackup) {
      setJobs(demoBackup.jobs);
      setProfile(demoBackup.profile);
      setSettings(demoBackup.settings);
    }
    setDemoBackup(null);
    setDemoMode(false);
    setActiveJob(null);
    setScreen("home");
  };

  const startNewJob = () => {
    const j = emptyJob();
    j.hourlyRate = settings.defaultHourlyRate || "";
    setActiveJob(j);
    setScreen("job");
  };

  const openSavedJob = (j) => {
    setActiveJob(j);
    setActiveResult(calc(j, settings));
    setActivePrice(j.selectedPrice ?? calc(j, settings).fairPrice);
    setScreen("results");
  };

  const handleCalculate = (job) => {
    const withMeta = { ...job, id: job.id || uid(), date: job.date || todayISO(), status: job.status || "Draft" };
    delete withMeta.selectedPrice; // costs just changed — start from a fresh Fair Price, not the old chosen price
    setActiveJob(withMeta);
    setScreen("results");
  };

  const saveJob = async (job, result, price, status) => {
    const record = {
      ...job,
      id: job.id || uid(),
      date: job.date || todayISO(),
      status: status || job.status || "Draft",
      selectedPrice: price,
    };
    const exists = jobs.some((j) => j.id === record.id);
    const next = exists ? jobs.map((j) => (j.id === record.id ? record : j)) : [record, ...jobs];
    await persistJobs(next);
    setActiveJob(record);
  };

  const goToQuote = (job, result, price) => {
    setActiveResult(result);
    setActivePrice(price);
    saveJob(job, result, price, job.status || "Draft");
    setScreen("quote");
  };

  const handleQuoteSent = async (quoteData) => {
    await saveJob(quoteData.job, quoteData.result, quoteData.price, "Quote Sent");
    setScreen("saved");
  };

  const deleteJob = async (id) => {
    await persistJobs(jobs.filter((j) => j.id !== id));
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{FONTS}</style>
        <div style={{ fontFamily: "Space Grotesk", color: COLORS.ink }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.paper,
        fontFamily: "Inter",
      }}
    >
      <style>{FONTS}</style>

      {demoMode && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 18px",
            background: COLORS.brass,
            color: "#fff",
          }}
        >
          <span style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 700 }}>
            DEMO MODE — sample data, nothing is saved
          </span>
          <button
            onClick={exitDemo}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 20,
              cursor: "pointer",
            }}
          >
            Exit demo
          </button>
        </div>
      )}

      {screen === "home" && (
        <Home
          jobs={jobs}
          settings={settings}
          onNewJob={startNewJob}
          onOpenJob={openSavedJob}
          onProfile={() => setScreen("profile")}
          onSaved={() => setScreen("saved")}
          demoMode={demoMode}
          onDemo={enterDemo}
        />
      )}

      {screen === "job" && (
        <JobForm
          initial={activeJob || emptyJob()}
          settings={settings}
          onBack={() => setScreen("home")}
          onCalculate={handleCalculate}
        />
      )}

      {screen === "results" && activeJob && (
        <Results
          job={activeJob}
          settings={settings}
          onBack={() => setScreen("home")}
          onEdit={() => setScreen("job")}
          onSave={saveJob}
          onQuote={goToQuote}
        />
      )}

      {screen === "quote" && activeJob && (
        <QuoteScreen
          job={activeJob}
          result={activeResult || calc(activeJob, settings)}
          price={activePrice}
          settings={settings}
          profile={profile}
          onBack={() => setScreen("results")}
          onSent={handleQuoteSent}
        />
      )}

      {screen === "saved" && (
        <SavedJobs
          jobs={jobs}
          settings={settings}
          onBack={() => setScreen("home")}
          onOpen={openSavedJob}
          onDelete={deleteJob}
        />
      )}

      {screen === "profile" && (
        <Profile
          profile={profile}
          settings={settings}
          onBack={() => setScreen("home")}
          onSave={async (p, s) => {
            await persistProfile(p);
            await persistSettings(s);
            setScreen("home");
          }}
        />
      )}
    </div>
  );
}
