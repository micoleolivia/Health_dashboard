// ─────────────────────────────────────────────────────────────
//  data/lifetables.js
//  Source: Stats SA Abridged Life Tables (2021)
//  Risk multipliers: WHO Global Health Observatory,
//  Lancet Global Health studies, published ASSA actuarial literature
// ─────────────────────────────────────────────────────────────

// SA life expectancy at exact age (years remaining + age = total LE)
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
// Impact in years of life expectancy gained (+) or lost (-)
// Sources cited per factor

const RISK_COEFFICIENTS = {

  // BMI impact (WHO / Lancet 2016 meta-analysis, 10.1 million adults)
  bmi: (bmiVal) => {
    if (bmiVal < 18.5) return { impact: -1.5, color: 'amber', label: 'Underweight' };
    if (bmiVal < 25)   return { impact:  1.0, color: 'good',  label: 'Healthy weight' };
    if (bmiVal < 30)   return { impact: -1.0, color: 'amber', label: 'Overweight' };
    if (bmiVal < 35)   return { impact: -3.0, color: 'warn',  label: 'Obese class I' };
                       return { impact: -5.0, color: 'warn',  label: 'Obese class II+' };
  },

  // Smoking (CDC, WHO; Doll et al. British Doctors Study)
  smoking: (status) => {
    if (status === 'current') return { impact: -10, color: 'warn',    label: 'Current smoker' };
    if (status === 'former')  return { impact:  -3, color: 'amber',   label: 'Former smoker' };
                              return { impact:   2, color: 'good',    label: 'Non-smoker' };
  },

  // Exercise (Lancet 2012; WHO physical activity guidelines)
  // days per week of moderate activity
  exercise: (days) => {
    if (days === 0)  return { impact: -3.5, color: 'warn',   label: 'Sedentary' };
    if (days <= 1)   return { impact: -1.0, color: 'amber',  label: 'Lightly active' };
    if (days <= 3)   return { impact:  1.5, color: 'good',   label: 'Moderately active' };
    if (days <= 5)   return { impact:  3.0, color: 'good',   label: 'Active' };
                     return { impact:  2.5, color: 'good',   label: 'Very active' };
  },

  // Sleep (Nature Communications 2021; Cappuccio meta-analysis)
  // hours per night
  sleep: (hours) => {
    if (hours < 6)          return { impact: -2.5, color: 'warn',   label: 'Sleep deprived' };
    if (hours < 7)          return { impact: -0.5, color: 'amber',  label: 'Slightly short' };
    if (hours <= 8)         return { impact:  1.5, color: 'good',   label: 'Optimal sleep' };
                            return { impact: -0.5, color: 'amber',  label: 'Oversleeping' };
  },

  // Alcohol (Lancet 2018; GBD 2016 Alcohol Collaborators)
  // standard drinks per week
  alcohol: (drinks) => {
    if (drinks === 0)  return { impact:  0.5, color: 'good',   label: 'Non-drinker' };
    if (drinks <= 7)   return { impact:  0.0, color: 'neutral', label: 'Low intake' };
    if (drinks <= 14)  return { impact: -1.5, color: 'amber',  label: 'Moderate intake' };
                       return { impact: -4.0, color: 'warn',   label: 'Heavy intake' };
  },

  // Diet quality (Lancet 2019 GBD Diet Collaborators)
  diet: (quality) => {
    if (quality === 'poor')      return { impact: -3.0, color: 'warn',    label: 'Poor diet' };
    if (quality === 'average')   return { impact:  0.0, color: 'neutral', label: 'Average diet' };
    if (quality === 'good')      return { impact:  1.5, color: 'good',    label: 'Good diet' };
                                 return { impact:  3.0, color: 'good',    label: 'Excellent diet' };
  },

  // Chronic conditions (WHO, AHA, published actuarial morbidity studies)
  conditions: {
    hypertension: { impact: -3.0, color: 'amber', label: 'Hypertension' },
    diabetes:     { impact: -5.0, color: 'warn',  label: 'Diabetes' },
    heartdisease: { impact: -7.0, color: 'warn',  label: 'Heart disease' }
  },

  // Family history of early cardiovascular death (Framingham Heart Study)
  familyHistory: {
    yes: { impact: -2.5, color: 'amber', label: 'Family history' },
    no:  { impact:  0.0, color: 'neutral', label: 'No family history' }
  }
};

// ─── Recommendation copy ──────────────────────────────────────
const RECOMMENDATIONS = {
  'Smoking':        'Quitting smoking is the single highest-impact change you can make — it could add up to 10 years of life expectancy.',
  'BMI':            'Moving into a healthy BMI range (18.5–24.9) through sustained diet and exercise changes could add several years.',
  'Exercise':       'Increasing to 3–5 days of moderate activity per week has the strongest evidence base of any lifestyle change.',
  'Sleep':          'Targeting 7–8 hours of consistent sleep is linked to meaningfully lower all-cause mortality.',
  'Alcohol':        'Reducing to under 7 standard drinks per week substantially lowers your cardiovascular and cancer risk.',
  'Diet':           'Shifting toward a Mediterranean-style diet pattern has the strongest dietary evidence for longevity.',
  'Hypertension':   'Managing blood pressure through medication and lifestyle changes is one of the most effective cardiac risk interventions.',
  'Diabetes':       'Active blood sugar management and regular HbA1c monitoring are critical to limiting long-term complications.',
  'Heart disease':  'Medication adherence and regular cardiac check-ups are your highest-leverage intervention.',
  'Family history': 'With a family history of early death, proactive screening from age 35 (cholesterol, BP, blood glucose) is strongly recommended.'
};
