---
theme: dashboard
title: ENARM RESULTS RESEARCh
toc: false
sql:
  enarm: ./data/enarm.duckdb
---
```js
import {DateTrend} from "./components/daysTrend.js";
import {Trend} from "./components/trend.js";
import {BarChart} from "./components/barChart.js";
```

```sql
FROM enarm.enarm_results 
ORDER BY promedio DESC
```

La escuela nacional de medicina y ciencias de la salud "Salvador Zubirán" (ENARM) es un examen que evalúa los conocimientos médicos de los aspirantes a residencias médicas en México. Este examen es altamente competitivo y se lleva a cabo anualmente. Los resultados del ENARM son cruciales para determinar la asignación de plazas en las diferentes especialidades médicas.

# Resultados 2024

```sql id=promedio_por_anio 
WITH date_summary AS (
    SELECT 
        date_id, 
        ROUND(AVG(promedio::FLOAT), 2) AS promedio,
        COUNT(*) AS cnt
    FROM enarm.enarm_results 
    GROUP BY date_id
),
stats AS (
    SELECT 
        AVG(promedio) AS overall_avg,
        STDDEV_SAMP(promedio) AS std_dev
    FROM date_summary
)
SELECT 
    ds.date_id,
    ds.promedio,
    ds.cnt,
    ROUND(s.overall_avg, 2) AS overall_avg,
    ROUND((ds.promedio - s.overall_avg) / NULLIF(s.std_dev, 0), 4) AS z_index,
    ROUND(s.overall_avg + 1.5 * s.std_dev, 2) AS plus_1_5_std,
    ROUND(s.overall_avg - 1.5 * s.std_dev, 2) AS minus_1_5_std
FROM date_summary ds
CROSS JOIN stats s
ORDER BY ds.date_id;
```



<!-- LINE PLOT WITH AVERAGE GRADE PER YEAR -->

```js
const average_per_year = promedio_por_anio.toArray()
const shows_ = average_per_year.map(d => d.promedio);
const max_ = d3.max(shows_);
const baseline_max_ = max_ * 1.10
```

## # de estudiantes
```sql id=total_estudiantes display
WITH base as (
  SELECT year, 
  SUM(sustentante)::INTEGER as sustentantes, 
  SUM(seleccionado)::INTEGER as seleccionado,
  ROUND(AVG(promedio::FLOAT), 2) AS promedio,
  ROUND((SUM(seleccionado)/SUM(sustentante))*100, 2) AS acceptance_rate,
FROM enarm.enarm_results 
GROUP BY year
ORDER BY year DESC
)
SELECT 
LAG(sustentantes,-1) OVER (ORDER BY year DESC) as ly_sustentantes,
ROUND((((sustentantes - LAG(sustentantes,-1) OVER (ORDER BY year DESC)) / LAG(sustentantes,-1) OVER (ORDER BY year DESC) )*100),2) as yoy_sustentates,
ROUND((((seleccionado - LAG(seleccionado,-1) OVER (ORDER BY year DESC)) / LAG(seleccionado,-1) OVER (ORDER BY year DESC) )*100),2) as yoy_seleccionados,
LAG(seleccionado,-1) OVER (ORDER BY year DESC) as ly_seleccionado,

ROUND(((promedio - LAG(promedio,-1) OVER (ORDER BY year DESC)) / LAG(promedio,-1) OVER (ORDER BY year DESC)) * 100,2) as yoy_promedio,

ROUND(((acceptance_rate - LAG(acceptance_rate,-1) OVER (ORDER BY year DESC)) / LAG(acceptance_rate,-1) OVER (ORDER BY year DESC)) * 100,2) as yoy_acceptance_rate,
*
FROM base
```

```js
let card_student = total_estudiantes.toArray()
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Sustentantes 2024 </h2>
    <span class="big">${card_student[0].sustentantes.toLocaleString()}
    <span class="small">YoY: ${Trend(card_student[0].yoy_sustentates)}</span>
    </span>
  </div>
  <div class="card">
    <h2>Seleccionados 2024 </h2>
    <span class="big">${card_student[0].seleccionado.toLocaleString()}
    <span class="small">YoY: ${Trend(card_student[0].yoy_seleccionados)}</span>
    </span>
  </div>
  <div class="card">
    <h2>Promedio 2024 </h2>
    <span class="big">${card_student[0].promedio.toLocaleString()}
    <span class="small">YoY: ${Trend(card_student[0].yoy_promedio)}</span>
    </span>
  </div>
  <div class="card">
    <h2>% de Aceptados </h2>
    <span class="big">${card_student[0].acceptance_rate.toLocaleString()}
    <span class="small">YoY: ${Trend(card_student[0].yoy_acceptance_rate)}</span>
    </span>
  </div>
</div>

```js
function calculateRegressionLine(x, y) {
  const n = x.length;
  const meanX = d3.mean(x);
  const meanY = d3.mean(y);

  // Calculate slope (m) and intercept (b)
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  // Generate regression line values
  const regressionY = x.map(xVal => slope * xVal + intercept);

  return { slope, intercept, regressionY };
}

let total_students = total_estudiantes.toArray();

let x_sustentantes = total_students.map(d => d.year);
let y_promedio = total_students.map(d => d.promedio);
let y_sustentantes = total_students.map(d => d.sustentantes);
let mean_sustentantes = Array(y_sustentantes.length).fill(d3.mean(y_sustentantes));
let median_sustentantes = Array(y_sustentantes.length).fill(d3.median(y_sustentantes));
let std_dev_plus_1_5 = Array(y_sustentantes.length).fill(d3.mean(y_sustentantes) + 1 * d3.deviation(y_sustentantes));
let std_dev_minus_1_5 = Array(y_sustentantes.length).fill(d3.mean(y_sustentantes) - 1 * d3.deviation(y_sustentantes));
let rolling_avg_3_years = y_sustentantes.map((_, i, arr) => {
  if (i > arr.length - 3) return null; // Not enough data for a 3-year rolling average
  return parseFloat(d3.mean(arr.slice(i, i + 3)).toFixed(2));
});

const { slope, intercept, regressionY } = calculateRegressionLine(x_sustentantes, y_sustentantes);

let baseline_sustentantes = d3.max(y_sustentantes)* 1.10;
let baseline_promedio = d3.max(y_promedio)* 1.10;

let data_sustentantes = {
  "y":y_sustentantes,
  "y_mean":mean_sustentantes,
  "y_median":median_sustentantes,
  "y_std_dev_plus_1_5":std_dev_plus_1_5,
  "y_std_dev_minus_1_5":std_dev_minus_1_5,
  "y_rolling_avg_3":rolling_avg_3_years,
  "x":x_sustentantes,
  "y_regression_line":regressionY,
  "baseline":baseline_sustentantes
}

let transformedData = data_sustentantes.x.map((_, index) => {
  return {
    x: data_sustentantes.x[index],
    y: data_sustentantes.y[index],
    y_mean: data_sustentantes.y_mean[index],
    y_median: data_sustentantes.y_median[index],
    y_std_dev_plus_1_5: data_sustentantes.y_std_dev_plus_1_5[index],
    y_std_dev_minus_1_5: data_sustentantes.y_std_dev_minus_1_5[index],
    y_rolling_avg_3: data_sustentantes.y_rolling_avg_3[index],
    y_regression_line: data_sustentantes.y_regression_line[index],
    baseline: data_sustentantes.baseline
  };
});

```

```js
let stacked_passed = card_student.flatMap(d=>[
  {year:d.year, outcome:"Seleccionados", value:(d.seleccionado / d.sustentantes)},
  {year:d.year, outcome:"Sustentantes", value:1-(d.seleccionado / d.sustentantes)}
])

function stacked_bar(data,{width}={}){
  return Plot.plot({
  height: 400,
  marginLeft: 60,
  marginBottom: 50,
  marginTop: 40,
  y: {percent: true, grid: true, label: "Share of Examinees (%)"},
  x:{type:'band', label:'Anio',tickRotate: -90},
  color: {legend: true, label: "Outcome", scheme:"tableau10"},
  marks: [
    Plot.barY(data, {
      x: "year",
      y: "value",
      fill: "outcome",
      offset: "normalize",          // makes every bar 100 %
      title: d => `${d.outcome}: ${d.value.toLocaleString()}`
    }),
    Plot.text(data, {
        x: "year",
        y: "value",
        // Only display text for "Seleccionados" outcome
        text: d => d.outcome === "Seleccionados" ? `${(d.value * 100).toFixed(2)}%` : "",
        dy: 10 , // Adjust vertical position of the text slightly
        fontSize: 10,
        align: "center",
      }),
  ]
})
}

let stack_chart = stacked_bar(stacked_passed);
```

```js
function barChartPromedio(data,baseline,{width}={}){
  return Plot.plot({
      marginTop: 30,
      marginRight: 20,
      marginBottom: 100,
      marginLeft: 60,
      grid: true,
      marks: [
        Plot.ruleY([baseline]),
        Plot.barY(data, {
          x: "year",
          y: "promedio",
          fill: "steelblue"
        }),
        Plot.text(data, {
          x: "year",
          y: "promedio",
          text: d => d.promedio,
          dy: -6, // Move label above the bar
          fill: "white",
          fontSize: 10,
          textAnchor: "middle"
        }),
        Plot.frame()
      ],
      y: {
        label: "Average",
        grid: 5
      },
      x: {
        type: "band",
        label: "date",
        tickRotate: -90 
      }
      })
}

let promedio_chart = barChartPromedio(total_students,baseline_promedio)

```

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Sustentantes por Anio</h2>
    <div class="grid grid-cols-2 gap-4">
      <div>${resize((width) => DateTrend(transformedData, data_sustentantes['baseline']))}</div>
      <div>${resize((width) => BarChart(transformedData, data_sustentantes['baseline']))}</div>
      <div>${stack_chart}</div>
      <div>${promedio_chart}</div>
    </div>
  </div>
</div>



<div class="card">
  <h2>Sustentantes por Anio</h2>
</div>


<!-- SECCION ESCEULAS -->
Las escuelas con el % de aceptación más alto son:
```sql
SELECT facultad as escuela, acceptance_rate FROM enarm.enarm_results 
WHERE year = 2024
ORDER BY z_index DESC
LIMIT 10
```

Escuelas con un porcentaje de aceptados mas alto que el anio pasado
```sql
WITH base as (SELECT 
  facultad as escuela, 
  acceptance_rate, 
  date_id,year,sustentante,seleccionado,
  LAG(acceptance_rate, -1) OVER (PARTITION BY school_id ORDER BY year DESC) as yoy,
  LAG(acceptance_rate, -2) OVER (PARTITION BY school_id ORDER BY year DESC) as yo_2,
  AVG(acceptance_rate) OVER (
    PARTITION BY school_id 
    ORDER BY year ASC 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as rolling_avg_3_years,
  school_id
FROM enarm.enarm_results 
--WHERE school_id = 'univ_panamericana'
ORDER BY year DESC),operating_years as (
  SELECT school_id,COUNT(year) operating_years FROM enarm.enarm_results 
  GROUP BY school_id
)
SELECT school_id, year, 
acceptance_rate,yoy,yo_2,rolling_avg_3_years,
CASE WHEN yoy > yo_2 AND acceptance_rate > yoy THEN 1 ELSE 0 END AS accp
FROM base
WHERE acceptance_rate > yoy AND year = 2024


-- SELECT escuela, year,acceptance_rate,
-- ((acceptance_rate - lag_accep) / lag_accep) * 100 as yoy,
-- acceptance_rate - rolling_avg_3_years as trend_diff, operating_years.operating_years
-- FROM base
-- LEFT JOIN operating_years ON base.school_id = operating_years.school_id
-- WHERE 
-- base.school_id = 'univ_aut_de_san_luis_potosi'
-- ORDER BY year DESC

-- SELECT school_id,
-- ((acceptance_rate - lag_accep) / lag_accep) * 100 as yoy,
-- acceptance_rate - rolling_avg_3_years as trend_diff
-- FROM base 
-- WHERE (acceptance_rate - rolling_avg_3_years) > 0 AND year = 2024
-- ORDER BY trend_diff DESC

-- inst_tecnologico_est_sup_mty__campus_cdmx
-- univ_aut_de_san_luis_potosi
-- univ_aut_de_aguascalientes
-- univ_aut_de_bc_u_mexicali
-- univ_aut_de_bc_u_tijuana
-- univ_veracruzana_u_cd_minatitlan
-- univ_veracruzana_u_xalapa
-- univ_marista_de_merida
-- univ_montemorelos
-- univ_aut_de_campeche
-- univ_durango_santander
-- univ_politecnica_de_pachuca
-- universidad_de_ixtlahuaca_cui
```


Las escuelas con el mayor numero de aceptados, por volumne, son:
```sql
SELECT facultad as escuela, seleccionado FROM enarm.enarm_results 
WHERE year = 2024
ORDER BY seleccionado DESC
LIMIT 10
```


Las escuelas con el promedio mas alto son:
```sql
WITH base AS (
  SELECT 
    facultad AS escuela, 
    year, 
    ROUND(promedio::FLOAT, 2) AS promedio,
    LAG(ROUND(promedio::FLOAT, 2)) OVER (
      PARTITION BY facultad 
      ORDER BY year ASC
    ) AS promedio_last_year,
    AVG(promedio::FLOAT) OVER (
      PARTITION BY facultad
    ) AS promedio_escuela,
    ROUND(AVG(promedio::FLOAT) OVER (
      PARTITION BY facultad
    ) + STDDEV_SAMP(promedio::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS std_dev_plus_1,
    ROUND(AVG(promedio::FLOAT) OVER (
      PARTITION BY facultad
    ) - STDDEV_SAMP(promedio::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS std_dev_minus_1
  FROM enarm.enarm_results
),
medians AS (
  SELECT 
    facultad AS escuela,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY promedio::FLOAT) AS mediana
  FROM enarm.enarm_results
  GROUP BY facultad
)
SELECT 
  b.escuela, 
  b.promedio, 
  b.promedio_last_year,
  b.promedio_escuela,
  b.std_dev_plus_1,
  b.std_dev_minus_1,
  m.mediana,
  CASE 
    WHEN b.promedio_last_year IS NOT NULL AND b.promedio_last_year != 0 
    THEN ROUND(((b.promedio - b.promedio_last_year) / b.promedio_last_year) * 100, 2)
    ELSE NULL
  END AS growth_percentage,
  CONCAT(
    CASE 
      WHEN b.promedio_last_year IS NOT NULL AND b.promedio_last_year != 0 AND b.promedio - b.promedio_last_year > 0 THEN '▲' 
      WHEN b.promedio_last_year IS NOT NULL AND b.promedio_last_year != 0 THEN '▼' 
      ELSE ''
    END,
    CASE 
      WHEN b.promedio_last_year IS NOT NULL AND b.promedio_last_year != 0 
      THEN ROUND(((b.promedio - b.promedio_last_year) / b.promedio_last_year) * 100, 2)::TEXT || '%' 
      ELSE 'N/A'
    END
  ) AS growth_pct
FROM base b
LEFT JOIN medians m ON b.escuela = m.escuela
WHERE b.year = 2024
ORDER BY b.promedio DESC
LIMIT 10;
```

Escuela por escuela
```sql
SELECT * FROM enarm.enarm_results 
WHERE  facultad = 'UNIV. PANAMERICANA'
ORDER BY year DESC
```