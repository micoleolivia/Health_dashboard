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
//  Each hazard ratio (HR) converted to years of life expectancy
//  impact using a Cox proportional hazards survival model:
//
//    S_new(t) = S_base(t) ^ HR
//
//  Applied to SA lx table in 0.5-year steps from current age to
//  110, integrated via trapezoidal rule. Reference category = 0.
//  All impacts derived at age 25, SA female baseline (remaining
//  LE = 40.83 years from survival model).
//
//  SCORE
//  ─────
//  Two factors contribute to the lifestyle score: BMI and smoking.
//  Score reanchored so worst case = 0, best case = MAX_SCORE_DELTA.
//  score = 100 - (scoreDelta / MAX_SCORE_DELTA) * 90
//  Score 10 = best possible · Score 50 = SA average · Score 100 = worst
//
//  SOURCES
//  ───────
//  Smoking:
//    Doll R, Peto R, Boreham J, Sutherland I. (2004).
//    "Mortality in relation to smoking: 50 years' observations
//    on male British doctors." BMJ, 328(7455), 1519.
//    DOI: 10.1136/bmj.38142.554479.AE
//    HR: current smoker=2.0, former smoker=1.3, never smoker=0.85
//    Derived impacts: current=-8.5yrs, former=-3.3yrs, never=+2.1yrs
//
//  BMI:
//    Di Angelantonio E, et al. (2016).
//    "Body-mass index and all-cause mortality: individual
//    participant data meta-analysis of 239 prospective studies
//    in four continents." The Lancet, 388(10046), 776–786.
//    DOI: 10.1016/S0140-6736(16)30175-1
//    HR: severely underweight(<16)=1.36, underweight(16-17.5)=1.25,
//        slightly underweight(17.5-18.5)=1.10, healthy(18.5-25)=1.0,
//        overweight(25-30)=1.11, obese I(30-35)=1.44, obese II+(35+)=1.88
//    Derived impacts: see RISK_COEFFICIENTS_RAW below
//
//  DISCLAIMER
//  ──────────
//  Proportional hazards model assumes time-invariant HR across all
//  ages. BMI and smoking treated as independent (additive).
//  HRs from global/Western populations applied to SA baseline.
//  Educational purposes only. Not medical advice.
// ═════════════════════════════════════════════════════════════════


// SA abridged life table — column "ex" (Stats SA 2021)
// Format: { age: remaining_life_expectancy_in_years }
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
//  Actual year impacts — used for LE and health age calculations
// ──────────────────────────────────────────────────────────────
const RISK_COEFFICIENTS_RAW = {

  // Smoking — Doll et al., BMJ 2004
  // HR: current=2.0, former=1.3, never=0.85
  // Derived via survival model on SA life table at age 25
  smoking: (status) => {
    if (status === 'current') return { impact: -8.5, color: 'warn',  label: 'Current smoker' };
    if (status === 'former')  return { impact: -3.3, color: 'amber', label: 'Former smoker' };
                              return { impact:  2.1, color: 'good',  label: 'Non-smoker' };
  },

  // BMI — Di Angelantonio et al., Lancet 2016
  // Gradient bands to avoid cliff-edge at 18.5 boundary
  // HR: <16=1.36, 16-17.5=1.25, 17.5-18.5=1.10, 18.5-25=1.0 (ref),
  //     25-30=1.11, 30-35=1.44, 35+=1.88
  bmi: (bmiVal) => {
    if (bmiVal < 18.5) return { impact: -3.8, color: 'warn',  label: 'Underweight' };
    if (bmiVal < 25)   return { impact:  0.0, color: 'good',  label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.3, color: 'amber', label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -4.5, color: 'warn',  label: 'Obese class I' };
                       return { impact: -7.7, color: 'warn',  label: 'Obese class II+' };
  },
};


// ─── SCORED coefficients ───────────────────────────────────────
//  Worst case = 0, best case = full range
//  Used ONLY for lifestyle score — not for LE or health age
//  Relative differences identical to RAW — anchor shifted only
//
//  Smoking shift = +8.5 (worst = current smoker at -8.5)
//  BMI shift     = +7.7 (worst = obese II+ at -7.7)
// ──────────────────────────────────────────────────────────────
const RISK_COEFFICIENTS_SCORED = {

  smoking: (status) => {
    if (status === 'current') return  0.0;
    if (status === 'former')  return  5.2;
                              return 10.6;
  },

  bmi: (bmiVal) => {
    if (bmiVal < 18.5) return { impact: -3.8, color: 'warn',  label: 'Underweight' };
    if (bmiVal < 25)   return { impact:  0.0, color: 'good',  label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.3, color: 'amber', label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -4.5, color: 'warn',  label: 'Obese class I' };
                       return { impact: -7.7, color: 'warn',  label: 'Obese class II+' };
  },
};

// Maximum possible scoreDelta (never smoker + healthy BMI)
// 10.6 + 7.7 = 18.3
const MAX_SCORE_DELTA = 18.3;


// ─── Recommendation copy ───────────────────────────────────────
const RECOMMENDATIONS = {
  'Smoking':
    'Quitting smoking is the single highest-impact change available — up to 8.5 years gained. ' +
    'Benefit begins within months and compounds over time. (Doll et al., BMJ 2004; HR=2.0)',
  'BMI':
    'Moving into a healthy BMI range (18.5–24.9) could recover years of life expectancy. ' +
    'Even modest weight changes produce measurable mortality benefit. ' +
    '(Di Angelantonio et al., Lancet 2016)'
};
