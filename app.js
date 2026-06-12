// ═════════════════════════════════════════════════════════════════
//  app.js — Vitality Health Risk Dashboard
// ═════════════════════════════════════════════════════════════════

let chart = null;

const state = {
  age:           25,
  sex:           'female',
  height:        165,
  weight:        62,
  exercise:      3,
  sleep:         7,
  smoking:       'never',
  alcohol:       2,
  diet:          'average',
  conditions:    ['none'],
  familyHistory: 'no'
};

// ═════════════════════════════════════════════════════════════════
//  LIFE TABLE HELPERS
// ═════════════════════════════════════════════════════════════════

function getBaseLE(age, sex) {
  const table = SA_LIFE_TABLES[sex];
  const ages  = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (age <= ages[0])               return age + table[ages[0]];
  if (age >= ages[ages.length - 1]) return age + table[ages[ages.length - 1]];
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      const t         = (age - ages[i]) / (ages[i + 1] - ages[i]);
      const remaining = table[ages[i]] + t * (table[ages[i + 1]] - table[ages[i]]);
      return age + remaining;
    }
  }
}

// ═════════════════════════════════════════════════════════════════
//  COMPUTE FACTORS — two parallel outputs
//  rawFactors:   actual year impacts — for LE and health age
//  scoreDelta:   reanchored points   — for lifestyle score only
// ═════════════════════════════════════════════════════════════════

function computeFactors(s) {
  const bmi        = s.weight / Math.pow(s.height / 100, 2);
  const rawFactors = [];
  let   scoreDelta = 0;

  // ─ Smoking ──────────────────────────────────────────────────
  const smokingRaw = RISK_COEFFICIENTS_RAW.smoking(s.smoking);
  rawFactors.push({ name: smokingRaw.label, key: 'Smoking', impact: smokingRaw.impact, color: smokingRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.smoking(s.smoking);

  // ─ BMI ──────────────────────────────────────────────────────
  const bmiRaw = RISK_COEFFICIENTS_RAW.bmi(bmi);
  rawFactors.push({ name: `${bmiRaw.label} (BMI ${Math.round(bmi * 10) / 10})`, key: 'BMI', impact: bmiRaw.impact, color: bmiRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.bmi(bmi);

  // ─ Exercise ─────────────────────────────────────────────────
  const exRaw = RISK_COEFFICIENTS_RAW.exercise(s.exercise);
  rawFactors.push({ name: exRaw.label, key: 'Exercise', impact: exRaw.impact, color: exRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.exercise(s.exercise);

  // ─ Sleep ────────────────────────────────────────────────────
  const sleepRaw = RISK_COEFFICIENTS_RAW.sleep(s.sleep);
  rawFactors.push({ name: sleepRaw.label, key: 'Sleep', impact: sleepRaw.impact, color: sleepRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.sleep(s.sleep);

  // ─ Alcohol ──────────────────────────────────────────────────
  const alcRaw = RISK_COEFFICIENTS_RAW.alcohol(s.alcohol);
  rawFactors.push({ name: alcRaw.label, key: 'Alcohol', impact: alcRaw.impact, color: alcRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.alcohol(s.alcohol);

  // ─ Diet ─────────────────────────────────────────────────────
  const dietRaw = RISK_COEFFICIENTS_RAW.diet(s.diet);
  rawFactors.push({ name: dietRaw.label, key: 'Diet', impact: dietRaw.impact, color: dietRaw.color });
  scoreDelta += RISK_COEFFICIENTS_SCORED.diet(s.diet);

  // ─ Conditions ───────────────────────────────────────────────
  if (s.conditions.includes('none')) {
    scoreDelta += RISK_COEFFICIENTS_SCORED.conditions.none;
  } else {
    s.conditions.forEach(c => {
      if (RISK_COEFFICIENTS_RAW.conditions[c]) {
        const r = RISK_COEFFICIENTS_RAW.conditions[c];
        rawFactors.push({ name: r.label, key: r.label, impact: r.impact, color: r.color });
        scoreDelta += RISK_COEFFICIENTS_SCORED.conditions[c];
      }
    });
  }

  // ─ Family history ────────────────────────────────────────────
  const fhRaw = RISK_COEFFICIENTS_RAW.familyHistory[s.familyHistory];
  if (fhRaw && fhRaw.impact !== 0) {
    rawFactors.push({ name: fhRaw.label, key: 'Family history', impact: fhRaw.impact, color: fhRaw.color });
  }
  scoreDelta += RISK_COEFFICIENTS_SCORED.familyHistory[s.familyHistory];

  return { rawFactors, scoreDelta };
}

// ═════════════════════════════════════════════════════════════════
//  RENDER — SUMMARY CARDS
// ═════════════════════════════════════════════════════════════════

function renderSummary(personalLE, baseLE, totalRawDelta, scoreDelta) {
  // Life expectancy — uses raw delta
  const diff = Math.round((personalLE - baseLE) * 10) / 10;
  const leEl = document.getElementById('le-val');
  leEl.textContent = personalLE;
  leEl.className   = 'stat-value ' + (diff >= 0 ? 'good' : diff < -3 ? 'warn' : 'amber');

  // Health age — uses raw delta
  const healthAge = Math.round((state.age - totalRawDelta) * 10) / 10;
  const ageDiff   = Math.round((healthAge - state.age) * 10) / 10;
  const haEl      = document.getElementById('health-age-val');
  haEl.textContent = Math.max(1, Math.round(healthAge));
  haEl.className   = 'stat-value ' + (ageDiff <= 0 ? 'good' : ageDiff > 3 ? 'warn' : 'amber');
  document.getElementById('health-age-sub').textContent = ageDiff <= 0
    ? `${Math.abs(ageDiff)} yrs younger than your age`
    : `${ageDiff} yrs older than your age`;

  // Lifestyle score — uses scored delta only
  const riskScore = Math.min(100, Math.max(10, Math.round(100 - (scoreDelta / MAX_SCORE_DELTA) * 90)));
  const rsEl      = document.getElementById('risk-score-val');
  rsEl.textContent = riskScore;
  rsEl.className   = 'stat-value ' + (riskScore < 35 ? 'good' : riskScore < 60 ? 'amber' : 'warn');
}

// ═════════════════════════════════════════════════════════════════
//  RENDER — RISK FACTOR BARS (uses raw factors — actual years)
// ═════════════════════════════════════════════════════════════════

function renderBars(rawFactors) {
  const container = document.getElementById('risk-bars');
  const maxAbs    = Math.max(...rawFactors.map(f => Math.abs(f.impact)), 3);

  container.innerHTML = rawFactors.map(f => {
    const pct       = Math.round(Math.abs(f.impact) / maxAbs * 100);
    const barClass  = f.color === 'good'  ? 'bar-good'
                    : f.color === 'warn'  ? 'bar-warn'
                    : f.color === 'amber' ? 'bar-amber'
                    :                       'bar-neutral';
    const textClass = f.color === 'good'  ? 'text-good'
                    : f.color === 'warn'  ? 'text-warn'
                    : f.color === 'amber' ? 'text-amber'
                    :                       'text-neutral';
    const sign = f.impact > 0 ? '+' : '';
    return `
      <div class="risk-bar-row">
        <span class="risk-factor-name">${f.name}</span>
        <div class="risk-bar-track">
          <div class="risk-bar-fill ${barClass}" style="width: ${pct}%"></div>
        </div>
        <span class="risk-impact ${textClass}">${sign}${f.impact} yrs</span>
      </div>`;
  }).join('');

  // Insight box
  const insightEl   = document.getElementById('top-insight');
  const worstFactor = rawFactors.reduce((a, b) => a.impact < b.impact ? a : b);
  const bestFactor  = rawFactors.reduce((a, b) => a.impact > b.impact ? a : b);
  if (worstFactor.impact < -1) {
    insightEl.className   = 'insight-box warn-box';
    insightEl.textContent = `Your biggest risk factor is ${worstFactor.name.toLowerCase()}, costing an estimated ${Math.abs(worstFactor.impact)} years of life expectancy.`;
  } else {
    insightEl.className   = 'insight-box';
    insightEl.textContent = `Your lifestyle profile is broadly positive. ${bestFactor.name} is your strongest asset, adding ${bestFactor.impact} years to your baseline.`;
  }
}

// ═════════════════════════════════════════════════════════════════
//  RENDER — CHART
// ═════════════════════════════════════════════════════════════════

function renderChart(personalLE, baseLE) {
  const delta     = personalLE - baseLE;
  const checkAges = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
  const saPopLE   = checkAges.map(a => Math.round(getBaseLE(a, state.sex) * 10) / 10);
  const myLE      = checkAges.map(a => {
    const base = getBaseLE(a, state.sex);
    return Math.max(a + 1, Math.round((base + delta) * 10) / 10);
  });

  const ctx = document.getElementById('le-chart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: checkAges.map(a => 'Age ' + a),
      datasets: [
        {
          label:           'Your trajectory',
          data:            myLE,
          borderColor:     '#2D6A4F',
          backgroundColor: 'rgba(45,106,79,0.08)',
          fill:            true,
          tension:         0.4,
          pointRadius:     3,
          borderWidth:     2
        },
        {
          label:       'SA population average',
          data:        saPopLE,
          borderColor: '#B0ADA6',
          borderDash:  [4, 4],
          fill:        false,
          tension:     0.4,
          pointRadius: 0,
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 11 }, color: '#7A7870', boxWidth: 20, padding: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} yrs` } }
      },
      scales: {
        y: {
          title: { display: true, text: 'Life expectancy (yrs)', font: { size: 11 }, color: '#B0ADA6' },
          grid:  { color: '#F0EDE6' },
          ticks: { color: '#B0ADA6', font: { size: 11 }, callback: v => Math.round(v) }
        },
        x: { grid: { display: false }, ticks: { color: '#B0ADA6', font: { size: 11 } } }
      }
    }
  });

  const leInsightEl = document.getElementById('le-insight');
  const saAvg       = Math.round(baseLE);
  const diff        = Math.round((personalLE - baseLE) * 10) / 10;
  if (diff >= 0) {
    leInsightEl.className   = 'insight-box';
    leInsightEl.textContent = `Your estimated life expectancy of ${personalLE} is ${diff} years above the SA ${state.sex} average of ${saAvg}. Keep going.`;
  } else {
    leInsightEl.className   = 'insight-box warn-box';
    leInsightEl.textContent = `Your estimated life expectancy of ${personalLE} is ${Math.abs(diff)} years below the SA ${state.sex} average of ${saAvg}.`;
  }
}

// ═════════════════════════════════════════════════════════════════
//  RENDER — RECOMMENDATIONS (uses raw factors — actual years)
// ═════════════════════════════════════════════════════════════════

function renderRecommendations(rawFactors) {
  const recEl      = document.getElementById('recommendations');
  const negFactors = rawFactors
    .filter(f => f.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 3);

  if (negFactors.length === 0) {
    recEl.innerHTML = `<p style="color:var(--accent);font-size:14px">
      Your current lifestyle profile has no significant negative risk factors.
      Focus on maintaining these habits — consistency is everything.
    </p>`;
    return;
  }

  recEl.innerHTML = negFactors.map((f, i) => {
    const recText = RECOMMENDATIONS[f.key] || 'Addressing this factor would improve your overall health score.';
    return `
      <div class="rec-item">
        <div class="rec-title">
          ${i + 1}. ${f.name}
          <span class="rec-impact">(${f.impact} yrs impact)</span>
        </div>
        <div class="rec-desc">${recText}</div>
      </div>`;
  }).join('');
}

// ═════════════════════════════════════════════════════════════════
//  MAIN UPDATE
// ═════════════════════════════════════════════════════════════════

function update() {
  ['age', 'height', 'weight', 'exercise', 'sleep', 'alcohol'].forEach(id => {
    state[id] = parseFloat(document.getElementById(id).value);
    document.getElementById(id + '-val').textContent = state[id];
  });

  const { rawFactors, scoreDelta } = computeFactors(state);
  const totalRawDelta = rawFactors.reduce((sum, f) => sum + f.impact, 0);
  const baseLE        = getBaseLE(state.age, state.sex);
  const personalLE    = Math.max(state.age + 1, Math.round((baseLE + totalRawDelta) * 10) / 10);

  renderSummary(personalLE, baseLE, totalRawDelta, scoreDelta);
  renderBars(rawFactors);
  renderChart(personalLE, baseLE);
  renderRecommendations(rawFactors);
}

// ═════════════════════════════════════════════════════════════════
//  TOGGLE HANDLERS
// ═════════════════════════════════════════════════════════════════

function setSex(val, btn) {
  state.sex = val;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update();
}

function setSmoking(val, btn) {
  state.smoking = val;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update();
}

function setDiet(val, btn) {
  state.diet = val;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update();
}

function setFamilyHistory(val, btn) {
  state.familyHistory = val;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update();
}

function toggleCondition(val, btn) {
  const group = btn.closest('.toggle-group');
  if (val === 'none') {
    state.conditions = ['none'];
    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    state.conditions = state.conditions.filter(c => c !== 'none');
    group.querySelector('[data-val="none"]').classList.remove('active');
    if (state.conditions.includes(val)) {
      state.conditions = state.conditions.filter(c => c !== val);
      btn.classList.remove('active');
    } else {
      state.conditions.push(val);
      btn.classList.add('active');
    }
    if (state.conditions.length === 0) {
      state.conditions = ['none'];
      group.querySelector('[data-val="none"]').classList.add('active');
    }
  }
  update();
}

// ═════════════════════════════════════════════════════════════════
//  INIT
// ═════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => { update(); });
