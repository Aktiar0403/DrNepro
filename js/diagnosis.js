export let diagnosisRules = [];

export function loadDiagnosisRules() {
  diagnosisRules = JSON.parse(localStorage.getItem('diagnosisRules')) || getDefaultRules();
  saveDiagnosisRules();
  return diagnosisRules;
}

export function saveDiagnosisRules() {
  localStorage.setItem('diagnosisRules', JSON.stringify(diagnosisRules));
}

export function getDefaultRules() {
  return [
    { type: "simple", test: "egfr", operator: "<", threshold: 90, suggestion: "CKD Stage 2", reason: "KDIGO guidelines" },
    { type: "simple", test: "egfr", operator: "<", threshold: 60, suggestion: "CKD Stage 3", reason: "Moderate reduction" },
    { type: "simple", test: "egfr", operator: "<", threshold: 30, suggestion: "CKD Stage 4", reason: "Severe reduction" },
    { type: "simple", test: "egfr", operator: "<", threshold: 15, suggestion: "CKD Stage 5 (ESRD)", reason: "Kidney failure" },
    { type: "simple", test: "acr", operator: ">", threshold: 30, suggestion: "Microalbuminuria", reason: "Early kidney damage" },
    { type: "simple", test: "acr", operator: ">", threshold: 300, suggestion: "Nephrotic-range proteinuria", reason: "Severe glomerular disease" },
    {
      type: "multi",
      conditions: [
        { section: "blood", field: "egfr", operator: "<", value: 60 },
        { section: "urine", field: "acr", operator: ">", value: 300 }
      ],
      suggestion: "Proteinuric CKD",
      reason: "Combined eGFR reduction and albuminuria."
    },
    {
      type: "compound",
      conditions: [
        { section: "history", field: "diabetes", operator: "==", value: true },
        { section: "blood", field: "egfr", operator: "<", value: 60 },
        { section: "urine", field: "acr", operator: ">", value: 300 },
        { section: "ultrasound", field: "echogenicity", operator: "in", value: ["Mildly increased", "Markedly increased"] }
      ],
      suggestion: "Likely Diabetic Nephropathy",
      reason: "Combines history, labs, USG."
    },
    {
      type: "compound",
      conditions: [
        { section: "history", field: "hypertension", operator: "==", value: true },
        { section: "blood", field: "egfr", operator: "<", value: 60 },
        { section: "urine", field: "acr", operator: "<", value: 300 },
        { section: "ultrasound", field: "kidneySize", operator: "==", value: "Decreased" },
        { section: "ultrasound", field: "echogenicity", operator: "==", value: "Mildly increased" }
      ],
      suggestion: "Possible Hypertensive Nephrosclerosis",
      reason: "Classic imaging + lab pattern."
    }
  ];
}

export function addDiagnosisRule(rule) {
  diagnosisRules.push(rule);
  saveDiagnosisRules();
}

export function deleteDiagnosisRule(index) {
  diagnosisRules.splice(index, 1);
  saveDiagnosisRules();
}

export function evaluateCondition(cond, visit) {
  const sectionData = visit[cond.section];
  if (!sectionData) return false;

  const val = sectionData[cond.field];
  if (val === undefined) return false;

  switch (cond.operator) {
    case "<": return parseFloat(val) < cond.value;
    case ">": return parseFloat(val) > cond.value;
    case "==": return val == cond.value;
    case "in": return cond.value.includes(val);
    default: return false;
  }
}

export function evaluateRule(rule, visit) {
  if (rule.type === "simple") {
    return evaluateCondition({
      section: "blood",
      field: rule.test,
      operator: rule.operator,
      value: rule.threshold
    }, visit);
  }

  if (rule.type === "multi" || rule.type === "compound") {
    return rule.conditions.every(cond => evaluateCondition(cond, visit));
  }

  return false;
}

export function generateDiagnosisText(visit) {
  const matches = [];
  for (const rule of diagnosisRules) {
    if (evaluateRule(rule, visit)) {
      matches.push(`- ${rule.suggestion} (Reason: ${rule.reason})`);
    }
  }
  return matches.length ? matches.join('\n') : "No diagnosis suggestions matched.";
}
