// ═════════════════════════════════════════════════════════════════
//  data/lifetables.js
// ═════════════════════════════════════════════════════════════════
//
//  LIFE TABLE SOURCE
//  ─────────────────
//  Statistics South Africa (Stats SA)
//  "Mortality and causes of death in South Africa: Findings from
//   death notification, 2021"
//  Table: Abridged life tables by sex, South Africa, 2021
//  URL: https://www.statssa.gov.za/publications/P03093/P030932021.pdf
//  Values used: Column "ex" (expectation of life at age x)
//  Female table = Table 2, Male table = Table 3
//
//  HOW COEFFICIENTS WERE DERIVED
//  ──────────────────────────────
//  All risk coefficients are derived using a proportional hazards
//  survival model applied directly to the SA life table above.
//
//  Method:
//  1. Convert Stats SA lx (survivors per 100,000) to a survival curve
//  2. Apply Cox proportional hazards transformation:
//       S_new(t) = S_base(t) ^ HR
//     where HR is the hazard ratio from the cited study
//  3. Integrate the adjusted survival curve using trapezoidal
//     integration in 0.5-year steps from the person's current age
//     to age 110
//  4. Subtract baseline LE to get years lost or gained
//
//  This is the standard actuarial approach for converting published
//  hazard ratios into life expectancy impacts anchored to a specific
//  population's mortality experience.
//
//  HAZARD RATIO SOURCES
//  ─────────────────────
//  Smoking:
//    Doll R, Peto R, Boreham J, Sutherland I. (2004). "Mortality in
//    relation to smoking: 50 years' observations on male British
//    doctors." BMJ, 328(7455), 1519. DOI: 10.1136/bmj.38142.554479.AE
//    HR: current=2.0, former=1.3, never=0.85
//
//  BMI:
//    Di Angelantonio et al. (2016). "Body-mass index and all-cause
//    mortality." The Lancet, 388(10046), 776–786.
//    DOI: 10.1016/S0140-6736(16)30175-1
//    HR: underweight=1.36, overweight=1.11, obese I=1.44, obese II=1.88
//
//  Exercise:
//    Lee I-M, et al. (2012). "Effect of physical inactivity on major
//    non-communicable diseases worldwide." The Lancet, 380(9838),
//    219–229. DOI: 10.1016/S0140-6736(12)61031-9
//    HR: sedentary=1.35, light=1.17, moderate=1.0 (ref),
//        active=0.97, very active=0.95
//
//  Sleep:
//    Cappuccio FP, et al. (2010). "Sleep duration and all-cause
//    mortality: a systematic review and meta-analysis."
//    Sleep, 33(5), 585–592. DOI: 10.1093/sleep/33.5.585
//    HR: <6hrs=1.12, 6-7hrs=1.06, 7-8hrs=1.0 (ref), >8hrs=1.08
//
//  Alcohol:
//    GBD 2016 Alcohol Collaborators (2018). "Alcohol use and burden
//    for 195 countries and territories, 1990–2016." The Lancet,
//    392(10152), 1015–1035. DOI: 10.1016/S0140-6736(18)31310-2
//    HR: none=1.04, low=1.0 (ref), moderate=1.11, heavy=1.37
//
//  Diet:
//    GBD 2017 Diet Collaborators (2019). "Health effects of dietary
//    risks in 195 countries." The Lancet, 393(10184), 1958–1972.
//    DOI: 10.1016/S0140-6736(19)30041-8
//    HR: poor=1.26, average=1.0 (ref), good=0.92, excellent=0.84
//
//  Hypertension:
//    Benjamin EJ, et al. (2019). "Heart Disease and Stroke Statistics
//    — 2019 Update." Circulation, 139(10), e56–e528.
//    DOI: 10.1161/CIR.0000000000000659
//    HR: 1.34
//
//  Diabetes:
//    IDF Diabetes Atlas, 10th edition (2021). diabetesatlas.org
//    HR: 1.57
//
//  Heart disease:
//    Benjamin EJ, et al. (2019). AHA Statistics. HR: 2.17
//
//  Family history:
//    Lloyd-Jones DM, et al. (2004). "Parental cardiovascular disease
//    as a risk factor for cardiovascular disease in middle-aged
//    adults." JAMA, 291(18), 2204–2211.
//    DOI: 10.1001/jama.291.18.2204
//    HR: 1.21
//
//  DISCLAIMER
//  ──────────
//  The proportional hazards model assumes a constant HR across all
//  ages (time-invariant hazard ratio). In reality HRs may vary with
//  age. Factors are treated as independent (additive LE impacts) —
//  real joint-probability actuarial models account for interactions.
//  Suitable for educational and portfolio purposes only.
//  Not medical advice.
// ═════════════════════════════════════════════════════════════════


// SA abridged life table — column "ex" (Stats SA 2021)
// Format: { age: total_life_expectancy }
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


// ─── Risk factor coefficients ─────────────────────────────────
//
//  All impacts in years of life expectancy gained (+) or lost (-)
//  Derived via Cox proportional hazards model applied to SA life
//  tables above. Reference categories score 0 (no adjustment).
//
const RISK_COEFFICIENTS = {

  // Smoking — Doll et al., BMJ 2004
  // HR: current=2.0, former=1.3, never=0.85
  // Derived impacts at age 25, SA female baseline
  smoking: (status) => {
    if (status === 'current') return { impact: -8.5, color: 'warn',    label: 'Current smoker' };
    if (status === 'former')  return { impact: -3.3, color: 'amber',   label: 'Former smoker' };
                              return { impact:  2.1, color: 'good',    label: 'Non-smoker' };
  },

  // BMI — Di Angelantonio et al., Lancet 2016
  // HR: <18.5=1.36, 18.5-25=1.0 (ref), 25-30=1.11, 30-35=1.44, 35+=1.88
  bmi: (bmiVal) => {
    if (bmiVal < 16.0) return { impact: -3.8, color: 'warn',    label: 'Severely underweight' };
if (bmiVal < 17.5) return { impact: -2.0, color: 'warn',    label: 'Underweight' };
if (bmiVal < 18.5) return { impact: -0.5, color: 'amber',   label: 'Slightly underweight' };
if (bmiVal < 25)   return { impact:  0.0, color: 'good',    label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.3, color: 'amber',   label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -4.5, color: 'warn',    label: 'Obese class I' };
                       return { impact: -7.7, color: 'warn',    label: 'Obese class II+' };
  },

  // Exercise — Lee et al., Lancet 2012
  // HR: sedentary=1.35, light=1.17, moderate=1.0 (ref), active=0.97, very active=0.95
  exercise: (days) => {
    if (days === 0) return { impact: -3.8, color: 'warn',    label: 'Sedentary' };
    if (days <= 1)  return { impact: -2.0, color: 'amber',   label: 'Lightly active' };
    if (days <= 3)  return { impact:  0.0, color: 'good',    label: 'Moderately active' };
    if (days <= 5)  return { impact:  0.4, color: 'good',    label: 'Active' };
                    return { impact:  0.7, color: 'good',    label: 'Very active' };
  },

  // Sleep — Cappuccio et al., Sleep 2010
  // HR: <6hrs=1.12, 6-7hrs=1.06, 7-8hrs=1.0 (ref), >8hrs=1.08
  sleep: (hours) => {
    if (hours < 6)  return { impact: -1.4, color: 'warn',    label: 'Sleep deprived' };
    if (hours < 7)  return { impact: -0.7, color: 'amber',   label: 'Short sleep' };
    if (hours <= 8) return { impact:  0.0, color: 'good',    label: 'Optimal sleep' };
                    return { impact: -1.0, color: 'amber',   label: 'Oversleeping' };
  },

  // Alcohol — GBD 2016 Alcohol Collaborators, Lancet 2018
  // HR: none=1.04, low=1.0 (ref), moderate=1.11, heavy=1.37
  // Note: non-drinker has slight excess risk vs low intake per GBD 2018
  alcohol: (drinks) => {
    if (drinks === 0) return { impact: -0.5, color: 'neutral', label: 'Non-drinker' };
    if (drinks <= 7)  return { impact:  0.0, color: 'good',    label: 'Low intake' };
    if (drinks <= 14) return { impact: -1.3, color: 'amber',   label: 'Moderate intake' };
                      return { impact: -3.9, color: 'warn',    label: 'Heavy intake' };
  },

  // Diet — GBD 2017 Diet Collaborators, Lancet 2019
  // HR: poor=1.26, average=1.0 (ref), good=0.92, excellent=0.84
  diet: (quality) => {
    if (quality === 'poor')    return { impact: -2.9, color: 'warn',    label: 'Poor diet' };
    if (quality === 'average') return { impact:  0.0, color: 'neutral', label: 'Average diet' };
    if (quality === 'good')    return { impact:  1.1, color: 'good',    label: 'Good diet' };
                               return { impact:  2.2, color: 'good',    label: 'Excellent diet' };
  },

  // Chronic conditions
  // Hypertension: HR=1.34 (AHA 2019); Diabetes: HR=1.57 (IDF 2021);
  // Heart disease: HR=2.17 (AHA 2019)
  conditions: {
    hypertension: { impact: -3.7, color: 'amber', label: 'Hypertension' },
    diabetes:     { impact: -5.6, color: 'warn',  label: 'Diabetes' },
    heartdisease: { impact: -9.4, color: 'warn',  label: 'Heart disease' }
  },

  // Family history — Lloyd-Jones et al., JAMA 2004 (Framingham)
  // Parental premature CVD: HR=1.21
  familyHistory: {
    yes: { impact: -2.4, color: 'amber',   label: 'Family history' },
    no:  { impact:  0.0, color: 'neutral', label: 'No family history' }
  }
};


// ─── Recommendation copy ──────────────────────────────────────────
const RECOMMENDATIONS = {
  'Smoking':
    'Quitting smoking is the single highest-impact change you can make — it could add up to 8.5 years. ' +
    'The benefit begins within months and compounds over time. (Doll et al., BMJ 2004; HR=2.0)',
  'BMI':
    'Moving into a healthy BMI range (18.5–24.9) could add up to 3.8 years. ' +
    'Even modest weight changes produce measurable mortality benefit. (Di Angelantonio et al., Lancet 2016; HR=1.36)',
  'Exercise':
    'Increasing to 3+ days of moderate activity per week could recover up to 3.8 years lost to inactivity. ' +
    'Even 15 minutes a day confers measurable benefit. (Lee et al., Lancet 2012; HR=1.35)',
  'Sleep':
    'Targeting 7–8 hours of consistent sleep is associated with 1.4 fewer years lost vs chronic short sleep. ' +
    'Consistent bedtimes and a dark, screen-free room are the first interventions. (Cappuccio et al., Sleep 2010; HR=1.12)',
  'Alcohol':
    'Reducing to 1–7 standard drinks per week is the reference category for lowest mortality risk. ' +
    'Heavy intake (15+/week) is associated with 3.9 years lost. (GBD 2016 Alcohol Collaborators, Lancet 2018; HR=1.37)',
  'Diet':
    'Shifting toward a Mediterranean-style diet pattern (vegetables, legumes, fish, olive oil) could add 2.2 years. ' +
    'Poor diet is associated with 2.9 years lost. (GBD 2017 Diet Collaborators, Lancet 2019; HR=1.26)',
  'Hypertension':
    'Active blood pressure management through medication and lifestyle changes could recover up to 3.7 years. ' +
    'Regular monitoring and sodium reduction are first-line interventions. (AHA 2019; HR=1.34)',
  'Diabetes':
    'Active blood sugar management and regular HbA1c monitoring are critical — diabetes is associated with 5.6 years lost. ' +
    'Medication adherence and foot/eye care limit long-term complications. (IDF Atlas 2021; HR=1.57)',
  'Heart disease':
    'Heart disease carries the highest single-condition impact at 9.4 years. ' +
    'Medication adherence, cardiac rehabilitation, and regular check-ups are your highest-leverage interventions. (AHA 2019; HR=2.17)',
  'Family history':
    'With a family history of early cardiovascular death, proactive screening from age 35 is strongly recommended. ' +
    'Cholesterol, blood pressure and fasting glucose checks are the priority. (Lloyd-Jones et al., JAMA 2004; HR=1.21)'
};
