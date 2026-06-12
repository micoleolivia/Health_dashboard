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
//  RISK COEFFICIENT SOURCES
//  ────────────────────────
//  BMI:
//    The GBD 2015 Obesity Collaborators (2017). "Health Effects of
//    Overweight and Obesity in 195 Countries over 25 Years."
//    New England Journal of Medicine, 377, 13–27.
//    DOI: 10.1056/NEJMoa1614362
//    + Di Angelantonio et al. (2016). "Body-mass index and all-cause
//    mortality." The Lancet, 388(10046), 776–786.
//    DOI: 10.1016/S0140-6736(16)30175-1
//
//  Smoking:
//    Doll R, Peto R, Boreham J, Sutherland I. (2004). "Mortality in
//    relation to smoking: 50 years' observations on male British
//    doctors." BMJ, 328(7455), 1519.
//    DOI: 10.1136/bmj.38142.554479.AE
//    + WHO Report on the Global Tobacco Epidemic (2023)
//    URL: https://www.who.int/publications/i/item/9789240077164
//
//  Exercise:
//    Lee I-M, et al. (2012). "Effect of physical inactivity on major
//    non-communicable diseases worldwide." The Lancet, 380(9838),
//    219–229. DOI: 10.1016/S0140-6736(12)61031-9
//    + WHO Global Action Plan on Physical Activity 2018–2030
//    URL: https://www.who.int/publications/i/item/9789241514187
//
//  Sleep:
//    Cappuccio FP, et al. (2010). "Sleep duration and all-cause
//    mortality: a systematic review and meta-analysis."
//    Sleep, 33(5), 585–592. DOI: 10.1093/sleep/33.5.585
//    + Liang YY, et al. (2021). "Association of sleep duration with
//    all-cause and cause-specific mortality." Nature Communications,
//    12, 4889. DOI: 10.1038/s41467-021-25246-3
//
//  Alcohol:
//    GBD 2016 Alcohol Collaborators (2018). "Alcohol use and burden
//    for 195 countries and territories, 1990–2016." The Lancet,
//    392(10152), 1015–1035. DOI: 10.1016/S0140-6736(18)31310-2
//
//  Diet:
//    GBD 2017 Diet Collaborators (2019). "Health effects of dietary
//    risks in 195 countries." The Lancet, 393(10184), 1958–1972.
//    DOI: 10.1016/S0140-6736(19)30041-8
//
//  Chronic conditions:
//    WHO Global Health Observatory — cause-specific mortality data
//    URL: https://www.who.int/data/gho
//    + Benjamin EJ, et al. (2019). "Heart Disease and Stroke
//    Statistics — 2019 Update." Circulation, 139(10), e56–e528.
//    DOI: 10.1161/CIR.0000000000000659
//    + IDF Diabetes Atlas, 10th edition (2021)
//    URL: https://diabetesatlas.org
//
//  Family history:
//    Lloyd-Jones DM, et al. (2004). "Parental cardiovascular disease
//    as a risk factor for cardiovascular disease in middle-aged
//    adults." JAMA, 291(18), 2204–2211.
//    DOI: 10.1001/jama.291.18.2204
//    (Framingham Heart Study offspring cohort)
//
//  DISCLAIMER
//  ──────────
//  Risk coefficients are simplified approximations derived from the
//  above literature. Real actuarial models use joint probability
//  distributions; this model assumes independence between factors
//  (i.e. impacts are additive). Suitable for educational and
//  portfolio purposes only — not medical advice.
// ═════════════════════════════════════════════════════════════════


// SA life expectancy at exact age x (total LE = age + remaining years)
// Source: Stats SA Abridged Life Tables, 2021 — column "ex"
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


// ─── Risk factor coefficients (years of LE gained/lost) ──────────

const RISK_COEFFICIENTS = {

  // BMI: Di Angelantonio et al., Lancet 2016 + GBD 2015 Obesity Collaborators, NEJM 2017
  // Hazard ratios converted to approximate life-years using SA baseline LE
  bmi: (bmiVal) => {
    if (bmiVal < 18.5) return { impact: -1.5, color: 'amber', label: 'Underweight' };
    if (bmiVal < 25)   return { impact:  1.0, color: 'good',  label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.0, color: 'amber', label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -3.0, color: 'warn',  label: 'Obese class I' };
                       return { impact: -5.0, color: 'warn',  label: 'Obese class II+' };
  },

  // Smoking: Doll et al., BMJ 2004 (50-year British Doctors Study)
  // Current smoker: ~10yr loss; former: partial recovery ~3yr loss vs never
  // Never smoker: ~2yr gain vs population average (which includes smokers)
  smoking: (status) => {
    if (status === 'current') return { impact: -10, color: 'warn',    label: 'Current smoker' };
    if (status === 'former')  return { impact:  -3, color: 'amber',   label: 'Former smoker' };
                              return { impact:   2, color: 'good',    label: 'Non-smoker' };
  },

  // Exercise: Lee et al., Lancet 2012 — physical inactivity causes ~5.3M deaths/yr globally
  // 150 min/week moderate activity = ~3.5yr gain; sedentary = ~3.5yr loss vs active baseline
  exercise: (days) => {
    if (days === 0) return { impact: -3.5, color: 'warn',    label: 'Sedentary' };
    if (days <= 1)  return { impact: -1.0, color: 'amber',   label: 'Lightly active' };
    if (days <= 3)  return { impact:  1.5, color: 'good',    label: 'Moderately active' };
    if (days <= 5)  return { impact:  3.0, color: 'good',    label: 'Active' };
                    return { impact:  2.5, color: 'good',    label: 'Very active' };
  },

  // Sleep: Cappuccio et al., Sleep 2010 meta-analysis (1.3M participants)
  // + Liang et al., Nature Communications 2021
  // <6hrs: HR ~1.12 all-cause mortality; >9hrs: HR ~1.17 (often confounded by illness)
  sleep: (hours) => {
    if (hours < 6)   return { impact: -2.5, color: 'warn',   label: 'Sleep deprived' };
    if (hours < 7)   return { impact: -0.5, color: 'amber',  label: 'Slightly short' };
    if (hours <= 8)  return { impact:  1.5, color: 'good',   label: 'Optimal sleep' };
                     return { impact: -0.5, color: 'amber',  label: 'Oversleeping' };
  },

  // Alcohol: GBD 2016 Alcohol Collaborators, Lancet 2018
  // No safe level for cancer risk; low intake cardiovascular benefit contested
  // >14 drinks/week: meaningfully elevated all-cause mortality
  alcohol: (drinks) => {
    if (drinks === 0) return { impact:  0.5, color: 'good',    label: 'Non-drinker' };
    if (drinks <= 7)  return { impact:  0.0, color: 'neutral', label: 'Low intake' };
    if (drinks <= 14) return { impact: -1.5, color: 'amber',   label: 'Moderate intake' };
                      return { impact: -4.0, color: 'warn',    label: 'Heavy intake' };
  },

  // Diet: GBD 2017 Diet Collaborators, Lancet 2019
  // Poor diet responsible for 11M deaths globally in 2017
  // Mediterranean-style diet associated with ~3yr LE gain in multiple cohort studies
  diet: (quality) => {
    if (quality === 'poor')    return { impact: -3.0, color: 'warn',    label: 'Poor diet' };
    if (quality === 'average') return { impact:  0.0, color: 'neutral', label: 'Average diet' };
    if (quality === 'good')    return { impact:  1.5, color: 'good',    label: 'Good diet' };
                               return { impact:  3.0, color: 'good',    label: 'Excellent diet' };
  },

  // Chronic conditions: WHO GHO + AHA 2019 Heart & Stroke Statistics + IDF Atlas 2021
  // Impacts reflect population-level LE reduction from diagnosis; vary by management quality
  conditions: {
    hypertension: { impact: -3.0, color: 'amber', label: 'Hypertension' },
    diabetes:     { impact: -5.0, color: 'warn',  label: 'Diabetes' },
    heartdisease: { impact: -7.0, color: 'warn',  label: 'Heart disease' }
  },

  // Family history: Lloyd-Jones et al., JAMA 2004 (Framingham Heart Study)
  // Parental premature CVD (before age 55M / 65F) → HR ~1.67 for CVD events
  // Converted to approximate LE impact
  familyHistory: {
    yes: { impact: -2.5, color: 'amber',   label: 'Family history' },
    no:  { impact:  0.0, color: 'neutral', label: 'No family history' }
  }
};


// ─── Recommendation copy ──────────────────────────────────────────
const RECOMMENDATIONS = {
  'Smoking':
    'Quitting smoking is the single highest-impact change you can make — it could add up to 10 years. ' +
    'The benefit begins within months and compounds over time. (Source: Doll et al., BMJ 2004)',
  'BMI':
    'Moving into a healthy BMI range (18.5–24.9) through sustained diet and exercise changes could add ' +
    'several years of life expectancy. (Source: Di Angelantonio et al., Lancet 2016)',
  'Exercise':
    'Increasing to 3–5 days of moderate activity per week is the lifestyle change with the strongest ' +
    'evidence base. Even 15 minutes a day confers measurable benefit. (Source: Lee et al., Lancet 2012)',
  'Sleep':
    'Targeting 7–8 hours of consistent sleep is linked to meaningfully lower all-cause mortality. ' +
    'Sleep hygiene — consistent bedtimes, dark room, no screens — is the first intervention. (Source: Cappuccio et al., Sleep 2010)',
  'Alcohol':
    'Reducing to under 7 standard drinks per week substantially lowers cardiovascular and cancer risk. ' +
    'There is no truly "safe" level for cancer specifically. (Source: GBD 2016, Lancet 2018)',
  'Diet':
    'Shifting toward a Mediterranean-style diet (vegetables, legumes, fish, olive oil, less red meat) ' +
    'has the strongest dietary evidence for longevity. (Source: GBD 2017 Diet Collaborators, Lancet 2019)',
  'Hypertension':
    'Actively managing blood pressure through medication adherence and reduced sodium intake is one of ' +
    'the most effective interventions for cardiac risk. (Source: WHO GHO; AHA 2019)',
  'Diabetes':
    'Active blood sugar management, regular HbA1c monitoring, and foot/eye care are critical to limiting ' +
    'long-term complications. (Source: IDF Diabetes Atlas, 10th ed., 2021)',
  'Heart disease':
    'Medication adherence and regular cardiac check-ups are your highest-leverage intervention. ' +
    'Cardiac rehabilitation programmes show strong survival benefit. (Source: AHA 2019)',
  'Family history':
    'With a family history of early cardiovascular death, proactive screening from age 35 ' +
    '(cholesterol, blood pressure, fasting glucose) is strongly recommended. (Source: Lloyd-Jones et al., JAMA 2004)'
};
