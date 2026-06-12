// ═════════════════════════════════════════════════════════════════
//  data/lifetables.js
// ═════════════════════════════════════════════════════════════════
//
//  LIFE TABLE SOURCE
//  ─────────────────
//  Statistics South Africa (Stats SA)
//  "Mortality and causes of death in South Africa: Findings from
//   death notification, 2021"
//  URL: https://www.statssa.gov.za/publications/P03093/P030932021.pdf
//  Values: Column "ex" (expectation of life at age x)
//  Female = Table 2, Male = Table 3
//
//  HOW COEFFICIENTS WERE DERIVED
//  ──────────────────────────────
//  Step 1 — Hazard ratios sourced from landmark published studies
//
//  Step 2 — Each HR converted to years of LE impact via Cox
//           proportional hazards survival model:
//             S_new(t) = S_base(t) ^ HR
//           Applied to SA female lx table in 0.5yr steps,
//           age 25 to 110, integrated via trapezoidal rule
//
//  Step 3 — Two coefficient sets produced:
//
//    RAW (RISK_COEFFICIENTS_RAW):
//      Reference category = 0. Used for LE and health age
//      calculations — these are actual year impacts.
//      e.g. sleep deprived = -1.4 years, optimal = 0.0 years
//
//    SCORED (RISK_COEFFICIENTS_SCORED):
//      Worst case = 0, best case = full range. Used only for
//      the lifestyle score display. Relative differences
//      between levels are identical to RAW — only anchor shifted.
//      e.g. sleep deprived = 0.0 pts, optimal = +1.4 pts
//
//  SCORE FORMULA
//  ─────────────
//  Uses SCORED values only:
//  score = 100 - (totalScoreDelta / MAX_SCORE_DELTA) * 90
//  MAX_SCORE_DELTA = 33.2 (all factors at best)
//  Score 10 = best possible · Score 50 = SA average · Score 100 = worst
//
//  HAZARD RATIO SOURCES
//  ─────────────────────
//  Smoking:      Doll et al., BMJ 2004. DOI: 10.1136/bmj.38142.554479.AE
//                HR: current=2.0, former=1.3, never=0.85
//  BMI:          Di Angelantonio et al., Lancet 2016.
//                DOI: 10.1016/S0140-6736(16)30175-1
//                HR: underweight=1.36, overweight=1.11, obeseI=1.44, obeseII=1.88
//  Exercise:     Lee et al., Lancet 2012. DOI: 10.1016/S0140-6736(12)61031-9
//                HR: sedentary=1.35, light=1.17, moderate=1.0, active=0.97, very=0.95
//  Sleep:        Cappuccio et al., Sleep 2010. DOI: 10.1093/sleep/33.5.585
//                HR: <6hrs=1.12, 6-7hrs=1.06, 7-8hrs=1.0, >8hrs=1.08
//  Alcohol:      GBD 2016 Collaborators, Lancet 2018.
//                DOI: 10.1016/S0140-6736(18)31310-2
//                HR: none=1.04, low=1.0, moderate=1.11, heavy=1.37
//  Diet:         GBD 2017 Diet Collaborators, Lancet 2019.
//                DOI: 10.1016/S0140-6736(19)30041-8
//                HR: poor=1.26, average=1.0, good=0.92, excellent=0.84
//  Hypertension: Benjamin et al., Circulation 2019. HR: 1.34
//  Diabetes:     IDF Diabetes Atlas 10th ed. (2021). HR: 1.57
//  Heart disease:Benjamin et al., Circulation 2019. HR: 2.17
//  Family hist:  Lloyd-Jones et al., JAMA 2004.
//                DOI: 10.1001/jama.291.18.2204. HR: 1.21
//
//  DISCLAIMER
//  ──────────
//  Assumes time-invariant HR across all ages. Factors treated as
//  independent (additive). HRs from global/Western populations
//  applied to SA baseline. Educational purposes only. Not medical advice.
// ═════════════════════════════════════════════════════════════════


// SA abridged life table — column "ex" (Stats SA 2021)
const SA_LIFE_TABLES = {
  female: {
    0: 69.0, 5: 65.3, 10: 60.4, 15: 55.5, 20: 50.7,
    25: 46.0, 30: 41.4, 35: 36.8, 40: 32.3, 45: 27.9,
    50: 23.7, 55: 19.7, 60: 16.0, 65: 12.7, 70: 9.8,
    75: 7.4,  80: 5.4
  },
  male: {
    0: 62.5, 5: 59.0, 10: 54.1, 15: 49.2, 20: 44.5,
    25: 40.0, 30: 35.6, 35: 31.2, 40: 26.9, 45: 22.8,
    50: 18.9, 55: 15.4, 60: 12.3, 65: 9.6,  70: 7.4,
    75: 5.7,  80: 4.2
  }
};


// ─── RAW coefficients ──────────────────────────────────────────
//  Reference category = 0
//  These are actual year impacts — used for LE and health age
// ──────────────────────────────────────────────────────────────
const RISK_COEFFICIENTS_RAW = {

  // Smoking — Doll et al., BMJ 2004
  smoking: (status) => {
    if (status === 'current') return { impact: -8.5, color: 'warn',  label: 'Current smoker' };
    if (status === 'former')  return { impact: -3.3, color: 'amber', label: 'Former smoker' };
                              return { impact:  2.1, color: 'good',  label: 'Non-smoker' };
  },

  // BMI — Di Angelantonio et al., Lancet 2016
  bmi: (bmiVal) => {
    if (bmiVal < 16.0) return { impact: -3.8, color: 'warn',  label: 'Severely underweight' };
    if (bmiVal < 17.5) return { impact: -2.0, color: 'warn',  label: 'Underweight' };
    if (bmiVal < 18.5) return { impact: -0.5, color: 'amber', label: 'Slightly underweight' };
    if (bmiVal < 25)   return { impact:  0.0, color: 'good',  label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.3, color: 'amber', label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -4.5, color: 'warn',  label: 'Obese class I' };
                       return { impact: -7.7, color: 'warn',  label: 'Obese class II+' };
  },

  // Exercise — Lee et al., Lancet 2012
  exercise: (days) => {
    if (days === 0) return { impact: -3.8, color: 'warn',  label: 'Sedentary' };
    if (days <= 1)  return { impact: -2.0, color: 'amber', label: 'Lightly active' };
    if (days <= 3)  return { impact:  0.0, color: 'good',  label: 'Moderately active' };
    if (days <= 5)  return { impact:  0.4, color: 'good',  label: 'Active' };
                    return { impact:  0.7, color: 'good',  label: 'Very active' };
  },

  // Sleep — Cappuccio et al., Sleep 2010
  sleep: (hours) => {
    if (hours < 6)  return { impact: -1.4, color: 'warn',  label: 'Sleep deprived' };
    if (hours < 7)  return { impact: -0.7, color: 'amber', label: 'Short sleep' };
    if (hours <= 8) return { impact:  0.0, color: 'good',  label: 'Optimal sleep' };
                    return { impact: -1.0, color: 'amber', label: 'Oversleeping' };
  },

  // Alcohol — GBD 2016 Collaborators, Lancet 2018
  alcohol: (drinks) => {
    if (drinks === 0) return { impact: -0.5, color: 'neutral', label: 'Non-drinker' };
    if (drinks <= 7)  return { impact:  0.0, color: 'good',    label: 'Low intake' };
    if (drinks <= 14) return { impact: -1.3, color: 'amber',   label: 'Moderate intake' };
                      return { impact: -3.9, color: 'warn',    label: 'Heavy intake' };
  },

  // Diet — GBD 2017 Diet Collaborators, Lancet 2019
  diet: (quality) => {
    if (quality === 'poor')    return { impact: -2.9, color: 'warn',    label: 'Poor diet' };
    if (quality === 'average') return { impact:  0.0, color: 'neutral', label: 'Average diet' };
    if (quality === 'good')    return { impact:  1.1, color: 'good',    label: 'Good diet' };
                               return { impact:  2.2, color: 'good',    label: 'Excellent diet' };
  },

  // Chronic conditions
  conditions: {
    hypertension: { impact: -3.7, color: 'amber', label: 'Hypertension' },
    diabetes:     { impact: -5.6, color: 'warn',  label: 'Diabetes' },
    heartdisease: { impact: -9.4, color: 'warn',  label: 'Heart disease' }
  },

  // Family history — Lloyd-Jones et al., JAMA 2004
  familyHistory: {
    yes: { impact: -2.4, color: 'amber',   label: 'Family history' },
    no:  { impact:  0.0, color: 'neutral', label: 'No family history' }
  }
};


// ─── SCORED coefficients ───────────────────────────────────────
//  Worst case = 0, best case = full range
//  Used ONLY for the lifestyle score display
//  All relative differences identical to RAW — anchor shifted only
// ──────────────────────────────────────────────────────────────
const RISK_COEFFICIENTS_SCORED = {

  // Shift = +8.5 (worst = current smoker at -8.5)
  smoking: (status) => {
    if (status === 'current') return  0.0;
    if (status === 'former')  return  5.2;
                              return 10.6;
  },

  // Shift = +7.7 (worst = obese II at -7.7)
  bmi: (bmiVal) => {
    if (bmiVal < 16.0) return  3.9;
    if (bmiVal < 17.5) return  5.7;
    if (bmiVal < 18.5) return  7.2;
    if (bmiVal < 25)   return  7.7;
    if (bmiVal < 30)   return  6.4;
    if (bmiVal < 35)   return  3.2;
                       return  0.0;
  },

  // Shift = +3.8 (worst = sedentary at -3.8)
  exercise: (days) => {
    if (days === 0) return 0.0;
    if (days <= 1)  return 1.8;
    if (days <= 3)  return 3.8;
    if (days <= 5)  return 4.2;
                    return 4.5;
  },

  // Shift = +1.4 (worst = sleep deprived at -1.4)
  sleep: (hours) => {
    if (hours < 6)  return 0.0;
    if (hours < 7)  return 0.7;
    if (hours <= 8) return 1.4;
                    return 0.4;
  },

  // Shift = +3.9 (worst = heavy at -3.9)
  alcohol: (drinks) => {
    if (drinks === 0) return 3.4;
    if (drinks <= 7)  return 3.9;
    if (drinks <= 14) return 2.6;
                      return 0.0;
  },

  // Shift = +2.9 (worst = poor diet at -2.9)
  diet: (quality) => {
    if (quality === 'poor')    return 0.0;
    if (quality === 'average') return 2.9;
    if (quality === 'good')    return 4.0;
                               return 5.1;
  },

  // Shift = +9.4 (worst = heart disease at -9.4)
  conditions: {
    none:         9.4,
    hypertension: 5.7,
    diabetes:     3.8,
    heartdisease: 0.0
  },

  // Shift = +2.4 (worst = family history yes at -2.4)
  familyHistory: {
    yes: 0.0,
    no:  2.4
  }
};

// Maximum possible score delta — all factors at best
// 10.6 + 7.7 + 4.5 + 1.4 + 3.9 + 5.1 + 9.4 + 2.4 = 45.0
const MAX_SCORE_DELTA = 45.0;


// ─── Recommendation copy ───────────────────────────────────────
const RECOMMENDATIONS = {
  'Smoking':
    'Quitting smoking is the single highest-impact change available — up to 10.6 years gained. ' +
    'Benefit begins within months and compounds over time. (Doll et al., BMJ 2004; HR=2.0)',
  'BMI':
    'Moving into a healthy BMI range (18.5–24.9) could add up to 3.8 years. ' +
    'Even modest weight changes produce measurable mortality benefit. (Di Angelantonio et al., Lancet 2016; HR=1.36)',
  'Exercise':
    'Increasing to 3+ days of moderate activity per week has the strongest lifestyle evidence base. ' +
    'Even 15 minutes a day confers measurable benefit. (Lee et al., Lancet 2012; HR=1.35)',
  'Sleep':
    'Chronic sleep deprivation is associated with 1.4 years of life expectancy lost. ' +
    'Consistent bedtimes and a dark screen-free room are first-line interventions. (Cappuccio et al., Sleep 2010; HR=1.12)',
  'Alcohol':
    'Heavy intake (15+/week) is associated with 3.9 years lost vs low intake. ' +
    'Reducing to 1–7 drinks per week brings you to the lowest mortality risk category. (GBD 2016 Alcohol Collaborators, Lancet 2018; HR=1.37)',
  'Diet':
    'Shifting toward a Mediterranean-style diet could add 2.2 years vs average diet. ' +
    'Poor diet is associated with 2.9 years lost. (GBD 2017 Diet Collaborators, Lancet 2019; HR=1.26)',
  'Hypertension':
    'Active blood pressure management addresses a 3.7-year mortality gap. ' +
    'Regular monitoring and sodium reduction are first-line. (AHA 2019; HR=1.34)',
  'Diabetes':
    'Diabetes is associated with 5.6 years lost. Active HbA1c management limits long-term complications. (IDF Atlas 2021; HR=1.57)',
  'Heart disease':
    'Heart disease carries the highest single-condition impact at 9.4 years. ' +
    'Medication adherence and cardiac rehabilitation are highest-leverage. (AHA 2019; HR=2.17)',
  'Family history':
    'With a family history of early cardiovascular death, proactive screening from age 35 is recommended. ' +
    'Cholesterol, blood pressure, and fasting glucose are the priority. (Lloyd-Jones et al., JAMA 2004; HR=1.21)'
};
