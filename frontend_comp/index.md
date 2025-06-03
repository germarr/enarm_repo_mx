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

# Resultados 2024

La escuela nacional de medicina y ciencias de la salud "Salvador Zubirán" (ENARM) es un examen que evalúa los conocimientos médicos de los aspirantes a residencias médicas en México. Este examen es altamente competitivo y se lleva a cabo anualmente. Los resultados del ENARM son cruciales para determinar la asignación de plazas en las diferentes especialidades médicas.

```sql id=promedio_por_anio
WITH date_summary AS (
    SELECT 
        year as date_id, 
        ROUND(AVG(promedio::FLOAT), 2) AS promedio,
        COUNT(*) AS cnt
    FROM enarm.enarm_results 
    GROUP BY year
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
    ROUND(s.overall_avg + 1 * s.std_dev, 2) AS plus_1_5_std,
    ROUND(s.overall_avg - 1 * s.std_dev, 2) AS minus_1_5_std
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

## Resumen
```sql id=total_estudiantes 
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
      title:"Promedio por anio",
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

```js
function linePromedios(data){
  return Plot.plot({
  grid: true,
  x: {
    type: "band",
    label: "Date",
    tickRotate: -90 
  },
  color: {
      legend: true,
      domain: ["Promedio", "overall_avg", "+1 STD DEV", "-1 STD DEV"],
      range: ["#ff8ab7", "white", "green", "red"],
      label: "Metrics"
  },
  marks: [
    Plot.lineY(data, { x: "date_id", y: "promedio", stroke: "#ff8ab7", curve: "catmull-rom", marker: "circle", label:"Promedio"}),

    Plot.lineY(data, { x: "date_id", y: "overall_avg", stroke: "white", strokeOpacity: 0.2, curve: "catmull-rom" }),

    Plot.lineY(data, { x: "date_id", y: "plus_1_5_std", strokeDasharray: "2,2", stroke: "green",strokeOpacity: 0.7, curve: "catmull-rom" }),

    Plot.lineY(data, { x: "date_id", y: "minus_1_5_std",strokeDasharray: "2,2", stroke: "red",strokeOpacity: 0.7, curve: "catmull-rom" }),
  
    Plot.text(data, {
      x: "date_id",
      y: "promedio",
      text: d => d.promedio,
      dy: -6, // Move label above the bar
      fill: "white",
      fontSize: 8,
      textAnchor: "middle"
    }),

    Plot.ruleX(
      data,
      Plot.pointerX({
        x: "date_id",
        strokeDasharray: [2, 2],
        stroke: "#888",
        channels: {
          "1":{ value: "promedio", label: "Resultado"},
          "2":{ value: "overall_avg", label: "Promedio"},
          "3":{ value: "plus_1_5_std", label: "+1 STD DEV"},
          "4":{ value: "minus_1_5_std", label: "-1 STD DEV"}
        },
        tip: {}
      })
    )
  ]
})
}

let lineChartPromedios = linePromedios(average_per_year)
```

<div class="grid grid-cols-1">
  <div>
    <div class="grid grid-cols-3 gap-4">
      <div class="card">
        <h2>Sustentates por anio</h2>
        <br>
        <span>${resize((width) => DateTrend(transformedData, data_sustentantes['baseline']))}</span>
      </div>
      <!-- <div>${resize((width) => BarChart(transformedData, data_sustentantes['baseline']))}</div> -->
      <div class="card">
        <h2>Seleccionados en %</h2>
        <br>
        <span>${stack_chart}</span>
      </div>
      <!-- <div>${promedio_chart}</div> -->
      <div class="card">
        <h2>Promedio por Anio</h2>
        <br>
        <span>${lineChartPromedios}</span>
      </div>
    </div>
  </div>
</div>


## Analisis por Escuela
```sql id=[total_escuelas_card]
with base as (
  SELECT year, COUNT(DISTINCT school_id) factultades, COUNT(DISTINCT estado_id) as estado_id
FROM enarm.enarm_results 
WHERE year IN (2024,2023)
GROUP BY year
ORDER BY year DESC)

SELECT year, factultades,
  LAG(factultades,-1) OVER (ORDER BY year DESC) as ly_facultades,

  ROUND(((factultades - LAG(factultades,-1) OVER (ORDER BY year DESC)) / LAG(factultades,-1) OVER (ORDER BY year DESC))*100,2) pct,

  estado_id,

  ROUND(((estado_id - LAG(estado_id,-1) OVER (ORDER BY year DESC)) / LAG(estado_id,-1) OVER (ORDER BY year DESC))*100,2) pct_2

from base 
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Total Escuelas 2024</h2>
    <span class="big">${total_escuelas_card.factultades.toLocaleString()}
    <span class="small">YoY: ${Trend(total_escuelas_card.pct)}</span>
    </span>
  </div>
  <div class="card">
    <h2>Total Estados 2024</h2>
    <span class="big">${total_escuelas_card.estado_id.toLocaleString()}
    <span class="small">YoY: ${Trend(total_escuelas_card.pct_2)}</span>
    </span>
  </div>
</div>

```sql id=aceptacion_por_escuela
  WITH base as (
    SELECT year, facultad as escuela, acceptance_rate,
    LAG(acceptance_rate, -1) OVER (PARTITION BY facultad ORDER BY year DESC) as yoy
    FROM enarm.enarm_results
  )

  SELECT * EXCLUDE(year,yoy), 
  CONCAT(
    yoy,' (',
    ROUND(((acceptance_rate - yoy) / yoy) * 100,2),'%',
    CASE WHEN yoy > acceptance_rate THEN ' 🔴' ELSE ' 🟢' END,')') as yoy_pct
  FROM base
  WHERE year = 2024
  ORDER BY acceptance_rate DESC
  ```

```sql id=escuelas_acept_mas_alto
  with base as (SELECT year, facultad as escuela, seleccionado,
  LAG(seleccionado,-1) OVER (PARTITION BY facultad ORDER BY year DESC) as yoy,
  acceptance_rate
  FROM enarm.enarm_results 
  ORDER BY seleccionado DESC)

  SELECT *  EXCLUDE(year,yoy,acceptance_rate), 
  CONCAT(
    yoy,' (',
    ROUND(((seleccionado - yoy) / yoy) * 100,2),'%',
    CASE WHEN yoy > seleccionado THEN ' 🔴' ELSE ' 🟢' END,')') as yoy_pct
    FROM base WHERE year = 2024
```

```sql id=more_schools_data
WITH base AS (
  SELECT 
  facultad as escuela, 
  year,
  ROUND(promedio::FLOAT, 2) AS promedio,
    LAG(ROUND(promedio::FLOAT, 2)) OVER (
      PARTITION BY facultad 
      ORDER BY year ASC
    ) AS yoy
  FROM enarm.enarm_results
)
SELECT * EXCLUDE(year,yoy) ,
CONCAT(
  yoy,' (',
  ROUND(((promedio - yoy) / yoy) * 100,2),'%',
  CASE WHEN yoy > promedio THEN ' 🔴' ELSE ' 🟢' END,')') as yoy_pct,
FROM base WHERE year = 2024  ORDER BY promedio DESC
```

```js
let accept_school = Inputs.table(
  aceptacion_por_escuela,
  {
    columns:["escuela","acceptance_rate"],
    header:{escuela:"Escuela",acceptance_rate:"% de aceptacion"},
    width:{escuela:351},
    rows: 5,
    multiple: false,
    select:false
  }
) 

let accept_school_mas_alto = Inputs.table(
  escuelas_acept_mas_alto,
  {
    columns:["escuela","seleccionado"],
    header:{escuela:"Escuela",seleccionado:"Total Seleccionados"},
    width:{escuela:351},
    rows: 5,
    multiple: false,
    select:false
  }
)

let more_schools_table = Inputs.table(
  more_schools_data,
  {
    columns:["escuela","promedio"],
    header:{escuela:"Escuela",promedio:"Promedio"},
    width:{escuela:351},
    rows: 5,
    multiple: false,
    select:false
  })
```

<!-- ```js
const selection = view(Inputs.table(ahcaray, {required: false}));

let pickOfSpeciality = selection[0]
let choosedSpeciality = "oftalmologia"

if(pickOfSpeciality === undefined || pickOfSpeciality.length === 0) {
  null
}else{
  choosedSpeciality = pickOfSpeciality.especialidad_id
}

display(choosedSpeciality)
``` -->
<!-- ```js
accept_school
``` -->
<div class="grid grid-cols-2">
  <div class="card"><h2>% de Aceptacion 2024</h2><br>${accept_school}</div>
  <div class="card"><h2>Total Seleccionados 2024</h2><br>${accept_school_mas_alto}</div>
  <div class="card"><h2>Promedio por Escuela 2024</h2><br>${more_schools_table}</div>
</div>


Escuela por escuela
```sql id=escuela_options
SELECT DISTINCT facultad FROM enarm.enarm_results 
ORDER BY year DESC
```

```js
let school_options = escuela_options.toArray()
let school_options_a = school_options.map(d => d.facultad)
const search_escuela = view(Inputs.select(school_options_a));
```

```sql id=[escuelas_con_el_promedio_mas_alto]
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
    ), 2) AS std_dev_minus_1,


    ROUND(acceptance_rate::FLOAT, 2) AS acceptance_rate,
    LAG(ROUND(acceptance_rate::FLOAT, 2)) OVER (
      PARTITION BY facultad 
      ORDER BY year ASC
    ) AS acceptance_rate_last_year,
    AVG(acceptance_rate::FLOAT) OVER (
      PARTITION BY facultad
    ) AS acceptance_rate_escuela,
    ROUND(AVG(acceptance_rate::FLOAT) OVER (
      PARTITION BY facultad
    ) + STDDEV_SAMP(acceptance_rate::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS acceptance_rate_std_dev_plus_1,
    ROUND(AVG(acceptance_rate::FLOAT) OVER (
      PARTITION BY facultad
    ) - STDDEV_SAMP(acceptance_rate::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS acceptance_rate_std_dev_minus_1,


    ROUND(sustentante::FLOAT, 2) AS sustentante,
    LAG(ROUND(sustentante::FLOAT, 2)) OVER (
      PARTITION BY facultad 
      ORDER BY year ASC
    ) AS sustentante_last_year,
    AVG(sustentante::FLOAT) OVER (
      PARTITION BY facultad
    ) AS sustentante_escuela,
    ROUND(AVG(sustentante::FLOAT) OVER (
      PARTITION BY facultad
    ) + STDDEV_SAMP(sustentante::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS sustentante_std_dev_plus_1,
    ROUND(AVG(sustentante::FLOAT) OVER (
      PARTITION BY facultad
    ) - STDDEV_SAMP(sustentante::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS sustentante_std_dev_minus_1,


    ROUND(seleccionado::FLOAT, 2) AS seleccionado,
    LAG(ROUND(seleccionado::FLOAT, 2)) OVER (
      PARTITION BY facultad 
      ORDER BY year ASC
    ) AS seleccionado_last_year,
    AVG(seleccionado::FLOAT) OVER (
      PARTITION BY facultad
    ) AS seleccionado_escuela,
    ROUND(AVG(seleccionado::FLOAT) OVER (
      PARTITION BY facultad
    ) + STDDEV_SAMP(seleccionado::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS seleccionado_std_dev_plus_1,
    ROUND(AVG(seleccionado::FLOAT) OVER (
      PARTITION BY facultad
    ) - STDDEV_SAMP(seleccionado::FLOAT) OVER (
      PARTITION BY facultad
    ), 2) AS seleccionado_std_dev_minus_1

  FROM enarm.enarm_results
),
medians AS (
  SELECT 
    facultad AS escuela,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY promedio::FLOAT) AS mediana,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acceptance_rate::FLOAT) AS mediana_acceptance_rate,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sustentante::FLOAT) AS mediana_sustentante,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seleccionado::FLOAT) AS mediana_seleccionado
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
    ELSE 0
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
  ) AS growth_pct,

  mediana_acceptance_rate,acceptance_rate_std_dev_minus_1,acceptance_rate_std_dev_plus_1,
  CASE WHEN acceptance_rate_last_year IS NULL THEN 0 ELSE ROUND(acceptance_rate_last_year,2) END AS acceptance_rate_last_year, 
  CASE WHEN acceptance_rate IS NULL THEN 0 ELSE acceptance_rate END AS acceptance_rate,
  CASE 
    WHEN b.acceptance_rate_last_year IS NOT NULL AND b.acceptance_rate_last_year != 0 
    THEN ROUND(((b.acceptance_rate - b.acceptance_rate_last_year) / b.acceptance_rate_last_year) * 100, 2)
    ELSE 0
  END AS growth_percentage_acceptance_rate,
  
  mediana_sustentante,sustentante_std_dev_minus_1,sustentante_std_dev_plus_1,ROUND(sustentante_last_year,2)sustentante_last_year,sustentante,
  CASE 
    WHEN b.sustentante_last_year IS NOT NULL AND b.sustentante_last_year != 0 
    THEN ROUND(((b.sustentante - b.sustentante_last_year) / b.sustentante_last_year) * 100, 2)
    ELSE 0
  END AS growth_percentage_sustentante,
  
  mediana_seleccionado,seleccionado_std_dev_minus_1,seleccionado_std_dev_plus_1,ROUND(seleccionado_last_year,2)seleccionado_last_year,seleccionado,
  CASE 
    WHEN b.seleccionado_last_year IS NOT NULL AND b.seleccionado_last_year != 0 
    THEN ROUND(((b.seleccionado - b.seleccionado_last_year) / b.seleccionado_last_year) * 100, 2)
    ELSE 0
  END AS growth_percentage_seleccionado,

FROM base b
LEFT JOIN medians m ON b.escuela = m.escuela
WHERE b.year = 2024 AND b.escuela = ${search_escuela}
ORDER BY b.promedio DESC;
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Promedio 2024</h2>
    <span class="big">${escuelas_con_el_promedio_mas_alto.promedio.toLocaleString()}
    <span class="small">YoY: ${Trend(escuelas_con_el_promedio_mas_alto.growth_percentage)}</span>
    </span>
  </div>
  <div class="card">
    <h2>Sustentantes 2024</h2>
    <span class="big">${escuelas_con_el_promedio_mas_alto.sustentante.toLocaleString()}
    <span class="small">YoY: ${Trend(escuelas_con_el_promedio_mas_alto.growth_percentage_sustentante)} (${escuelas_con_el_promedio_mas_alto.sustentante_last_year.toLocaleString()})</span>
    </span>
  </div>
  <div class="card">
    <h2>Seleccionados 2024</h2>
    <span class="big">${escuelas_con_el_promedio_mas_alto.seleccionado.toLocaleString()}
    <span class="small">YoY: ${Trend(escuelas_con_el_promedio_mas_alto.growth_percentage_seleccionado)} (${escuelas_con_el_promedio_mas_alto.seleccionado_last_year.toLocaleString()})</span>
    </span>
  </div>
  <div class="card">
    <h2>% de Aceptacion 2024</h2>
    <span class="big">${escuelas_con_el_promedio_mas_alto.acceptance_rate.toLocaleString()}
    <span class="small">YoY: ${Trend(escuelas_con_el_promedio_mas_alto.growth_percentage_acceptance_rate)} (${escuelas_con_el_promedio_mas_alto.acceptance_rate_last_year.toLocaleString()})</span>
    </span>
  </div>
</div>



```sql id=escuela_por_escuela
SELECT * FROM enarm.enarm_results 
WHERE facultad = ${search_escuela}
ORDER BY year DESC
```


```sql id=escuelas_el_anio_pasado
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

```sql id=promedio_por_anio_ 
SELECT especialidad_id,year, 
puntaje_min,puntaje_max, avg_puntaje_min,std_puntaje_min_plus_1,std_puntaje_min_minus_1
FROM enarm.enarm_min_max
where especialidad_id ='otorrinolaringologia_y_cirugia_de_cabeza_y_cuello'
order by year desc
```


```sql id=cirugia_general
  SELECT especialidad_id,year, 
  puntaje_min,puntaje_max, avg_puntaje_min,std_puntaje_min_plus_1,std_puntaje_min_minus_1
  FROM enarm.enarm_min_max
  where especialidad_id ='cirugia_general'
  order by year desc
```

```sql id=all_specs
  SELECT especialidad_id,year, 
  puntaje_min,puntaje_max, avg_puntaje_min,std_puntaje_min_plus_1,std_puntaje_min_minus_1
  FROM enarm.enarm_min_max
  order by year desc
```

```sql id=specialties
SELECT DISTINCT especialidad_id
FROM enarm.enarm_min_max
```


```sql id=ahcaray
SELECT DISTINCT especialidad_id, 
COUNT(*) as year,
MAX(avg_puntaje_min) avg_puntaje_min,
MAX(avg_puntaje_max) avg_puntaje_max,
MAX(avg_puntaje_max) - MAX(avg_puntaje_min) diff
FROM enarm.enarm_min_max
GROUP BY especialidad_id
ORDER BY avg_puntaje_max DESC, MAX(avg_puntaje_max) - MAX(avg_puntaje_min) DESC
```

## Informacion por Especialidad
```sql id=[specialities_yoy]
with current_yr as (
  SELECT COUNT(*) as especialidades, year 
  FROM enarm.enarm_min_max WHERE year = '2024.csv' GROUP BY year), 

  last_year as (
  SELECT COUNT(*) as especialidades, year 
  FROM enarm.enarm_min_max WHERE year = '2023.csv' GROUP BY year),

  base as (
    SELECT * FROM current_yr 
    UNION 
    SELECT * FROM last_year
  )

SELECT ROUND(((especialidades - LAG(especialidades, -1) OVER (ORDER BY year DESC)) /LAG(especialidades, -1) OVER (ORDER BY year DESC)) * 100 ,2) as last_year
FROM base
LIMIT 1
```

```sql id=[top_puntajes_especialidad]
WITH current_year as (SELECT especialidad_id, puntaje_max, year
FROM enarm.enarm_min_max 
WHERE year = '2024.csv'
ORDER BY puntaje_max DESC LIMIT 1),
last_year as (SELECT especialidad_id, puntaje_max, year
FROM enarm.enarm_min_max 
WHERE year = '2023.csv'
ORDER BY puntaje_max DESC LIMIT 1),
base as (SELECT * FROM current_year
UNION
SELECT * FROM last_year)

SELECT year,especialidad_id,
LAG(especialidad_id,-1) OVER(ORDER BY year DESC) as last_year_sp, 
puntaje_max,
LAG(puntaje_max,-1) OVER(ORDER BY year DESC) as last_year_puntaje
FROM base
LIMIT 1
```

```sql id=[minmax_year_min_max]
with base as (
  SELECT year, ROUND(AVG(puntaje_min),2) as puntaje_min, ROUND(AVG(puntaje_max),2) as puntaje_max
FROM enarm.enarm_min_max 
WHERE year IN ('2024.csv','2023.csv')
GROUP BY year
)

SELECT *,

ROUND((puntaje_min - LAG(puntaje_min,-1) OVER (ORDER BY year DESC)) / LAG(puntaje_min,-1) OVER (ORDER BY year DESC) * 100,2) as last_yr_puntaje_min,
ROUND(((puntaje_max - LAG(puntaje_max,-1) OVER (ORDER BY year DESC)) / LAG(puntaje_max,-1) OVER (ORDER BY year DESC)) * 100,2)  as last_yr_puntaje_max
FROM base
LIMIT 1
```

```js
const [patatas] = await sql`SELECT COUNT(*) as s FROM enarm.enarm_min_max WHERE year = '2024.csv'`;
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Total Especialidades 2024 </h2>
    <span class="big">${patatas.s.toLocaleString()}
    <span class="small">YoY: ${Trend(specialities_yoy.last_year)}</span>
    </span>
  </div>
  <div class="card">
    <h2>Puntaje mas alto</h2>
    <span style="font-weight:bold; font-size:18px" class="">${top_puntajes_especialidad.especialidad_id}
    <span class='small'>(${top_puntajes_especialidad.puntaje_max})</span></span>
  </div>
  <div class="card">
    <h2>Promedio Puntaje Alto</h2>
    <span style="font-weight:bold; font-size:18px" class="">${minmax_year_min_max.puntaje_max.toLocaleString()}
    <span class="small">YoY: ${Trend(minmax_year_min_max.last_yr_puntaje_max.toLocaleString())}</span>
  </div>
  <div class="card">
    <h2>Promedio Puntaje Bajo</h2>
    <span style="font-weight:bold; font-size:18px" class="">${minmax_year_min_max.puntaje_min.toLocaleString()}
    <span class="small">YoY: ${Trend(minmax_year_min_max.last_yr_puntaje_min.toLocaleString())}</span>
  </div>
</div>

Selecciona una especialidad:
```js
let sp_input = specialties.toArray()

let ktp = sp_input.map(d => d.especialidad_id);

const speciality = view(Inputs.select(ktp, {value: "oftalmologia", label: "Especialidad"}));
```

<!-- ```js
const selection = view(Inputs.table(ahcaray, {required: false}));
``` -->

<!-- ```js
let pickOfSpeciality = selection[0]
let choosedSpeciality = "oftalmologia"

if(pickOfSpeciality === undefined || pickOfSpeciality.length === 0) {
  null
}else{
  choosedSpeciality = pickOfSpeciality.especialidad_id
}

display(choosedSpeciality)
``` -->

```sql id=oftalmologia
  SELECT especialidad_id,year, 
  puntaje_min,puntaje_max, avg_puntaje_min,std_puntaje_min_plus_1,std_puntaje_min_minus_1,
  avg_puntaje_max,std_puntaje_max_plus_1,std_puntaje_max_minus_1, diff
  FROM enarm.enarm_min_max
  where especialidad_id = ${speciality}
  order by year desc
```

```sql id=[all_results_minmax] display
WITH base as (  SELECT year,ROUND(puntaje_min,2) as puntaje_min,
  LAG(puntaje_min,-1) OVER (ORDER BY year DESC) as last_yr_min,
  ROUND(puntaje_max,2) puntaje_max,
  LAG(puntaje_max,-1) OVER (ORDER BY year DESC) as last_yr_max,
  FROM enarm.enarm_min_max
  where especialidad_id = ${speciality}
  order by year desc),
  avge as (
    SELECT AVG(puntaje_min) as av_min, AVG(puntaje_max) as av_max
    FROM enarm.enarm_min_max
    where especialidad_id = ${speciality}
  )

SELECT *, 
ROUND(((puntaje_min - last_yr_min) / last_yr_min) * 100,2) as min_diff,
ROUND(((puntaje_max - last_yr_max) / last_yr_max) * 100,2) as max_diff,
ROUND((SELECT av_min from avge),2) as avg_min,
ROUND((SELECT av_max from avge),2) as avg_max
From base
```
<!-- Line chart of the selected specialty -->
<div class="grid grid-cols-4">
  <div class="card">
    <h2>Puntaje Maximo 2024</h2>
    <span class="big">${all_results_minmax.puntaje_max.toLocaleString()}
    <span class="small">YoY: ${Trend(all_results_minmax.max_diff)}</span>
    </span>
  </div>
   
   <div class="card">
    <h2>Puntaje Minimo 2024</h2>
    <span class="big">${all_results_minmax.puntaje_min.toLocaleString()}
    <span class="small">YoY: ${Trend(all_results_minmax.min_diff)}</span>
    </span>
  </div>

  <div class="card">
    <h2>Promedio Historico (Max - Min)</h2>
    <span class="big">${all_results_minmax.avg_max.toLocaleString()} - ${all_results_minmax.avg_min.toLocaleString()}
    </span>
  </div>
</div>

```js
let listOfSpecialties = specialties.toArray()

let all_specs_df = all_specs.toArray()

let min_m_oftalmologia = oftalmologia.toArray()
let shows_min_oftalmologia = min_m_oftalmologia.map(d => d.puntaje_min);
let baseline_c_oftalmologia = d3.max(shows_min_oftalmologia)* 1.01;

let rrr = [
  {"data":min_m_oftalmologia,"baseline":baseline_c_oftalmologia}
]
```

```js
function EnarmMinScorePlot(data,dsb, { title = "Puntaje Mínimo ENARM", ...options } = {}) {
  return Plot.plot({
    ...options,
    height: 400,
    width: 700,
    grid: true,
    inset: 10,
    marks: [
      // baseline
      Plot.ruleY([dsb], { stroke: "#444", strokeDasharray: "0,1" }),

      // original lines
      Plot.lineY(data, { x: "year", y: "puntaje_min", stroke: "#ff8ab7", curve: "catmull-rom" }),
      Plot.lineY(data, { x: "year", y: "avg_puntaje_min", stroke: "white", strokeOpacity: 0.2, curve: "catmull-rom" }),

      // // +1 std dev line
      // Plot.lineY(data, {
      //   x: "year",
      //   y: "std_puntaje_min_plus_1",
      //   stroke: "#007aff",
      //   curve: "catmull-rom",
      //   strokeDasharray: "4,2"
      // }),

      // // -1 std dev line
      // Plot.lineY(data, {
      //   x: "year",
      //   y: "std_puntaje_min_minus_1",
      //   stroke: "#007aff",
      //   curve: "catmull-rom",
      //   strokeDasharray: "2,2", 
      // }),

      Plot.lineY(data, { x: "year", y: "puntaje_max", stroke: "#ff8ab7", curve: "catmull-rom" }),
      Plot.lineY(data, { x: "year", y: "avg_puntaje_max", stroke: "white", strokeOpacity: 0.2, curve: "catmull-rom" }),

      // // +1 std dev line
      // Plot.lineY(data, {
      //   x: "year",
      //   y: "std_puntaje_max_plus_1",
      //   stroke: "#007aff",
      //   curve: "catmull-rom",
      //   strokeDasharray: "4,2"
      // }),

      // // -1 std dev line
      // Plot.lineY(data, {
      //   x: "year",
      //   y: "std_puntaje_max_minus_1",
      //   stroke: "#007aff",
      //   curve: "catmull-rom",
      //   strokeDasharray: "2,2"
      // }),

      // hover pointer
      Plot.ruleX(
        data,
        Plot.pointerX({
          x: "year",
          strokeDasharray: [2, 2],
          stroke: "#888",
          channels: {
            "1":{ value: "puntaje_min", label: "Puntaje Min"},
            "2":{ value: "puntaje_max", label: "Puntaje Max"},
            "3":{ value: "diff", label: "Diferencia"}
          },
          tip: {}
        })
      ),
      Plot.ruleX(data, {
        x: "year",
        y1: "puntaje_min",
        y2: "puntaje_max",
        stroke: "white",
        markerEnd: "dot",
        markerStart: "dot",
      }),
      Plot.text(data, {
      x: "year",
      y: d => (d.puntaje_min + d.puntaje_max) / 2,
      text: d => `${d.diff}`,
      fill: "white",
      fontWeight: "bold"
    })
    ]
  });
}
```

```js
EnarmMinScorePlot(rrr[0]["data"], rrr[0]["baseline"])
```

```sql id=scatter_results display
WITH avg_acc as (
  SELECT AVG(acceptance_rate) as ar FROM enarm.enarm_results
  WHERE year = 2024
)
SELECT year,facultad, school_id, sustentante,seleccionado, promedio, acceptance_rate,
  CASE WHEN acceptance_rate >= (SELECT * FROM avg_acc) THEN 'above'
  ELSE 'below' END AS stag
FROM enarm.enarm_results
WHERE year = 2024
```

<!-- Scatter -->
```js
function scatterPlot(data, {width} = {}){
  return Plot.plot({
    width:width,
    height:500,
    marginLeft:60,
    marginBottom:50,
    marginTop:40,
    color: { scheme: "tableau10", legend: true },
    x:{label:"seleccionado", grid:true},
    y:{label:"promedio", grid:true},
    marks:[
      Plot.ruleY([d3.mean(data, d => d.promedio)], { stroke: "orange", strokeDasharray: "4,2", label: "Promedio promedio" }),    
      Plot.dot(data,{x:'seleccionado', y:'promedio', stroke: "stag"}),
      // Plot.tip([`UNAM\n\nSustentantes: `],{y:57.923,x:1202, anchor:"bottom"}),
      Plot.tip(data, Plot.pointer({
        x:'seleccionado',
        y:'promedio',
        title:(d)=>`${d.facultad}\n\nSeleccionado: ${d.seleccionado.toLocaleString()}\nSustentante: ${d.sustentante.toLocaleString()}\nPromedio: ${d.promedio}`
      }))
    ]
  })
}

function scatterPlot1(data, {width} = {}){
  // Capitalize the 'stag' values for legend display
  const capitalizedData = data.map(d => ({
    ...d,
    stag: d.stag ? d.stag.charAt(0).toUpperCase() + d.stag.slice(1) : d.stag
  }));

  return Plot.plot({
    width: width,
    marginLeft: 60,
    marginBottom: 50,
    marginTop: 40,
    color: { scheme: "tableau10", legend: true },
    x: { label: "Seleccionado", grid: true },
    y: { label: "Sustentante", grid: true },
    marks: [
      Plot.ruleY([2400], { strokeDasharray: "0,01" }),
      Plot.dot(capitalizedData, { x: 'seleccionado', y: 'sustentante', stroke: "stag" }),
      Plot.tip(capitalizedData, Plot.pointer({
        x: 'seleccionado',
        y: 'sustentante',
        title: (d) => `${d.facultad}\n\nSustentantes: ${d.sustentante.toLocaleString()}\nSeleccionados: ${d.seleccionado.toLocaleString()}\n % de Aceptacion: ${d.acceptance_rate}%`
      }))
    ]
  })
}
```



```js
let scatter_data = scatter_results.toArray()
```

<div class="grid grid-cols-2">
  <div class="card">
    ${scatterPlot(scatter_data, {width:700})}

  </div>
  <div class="card">
    ${resize((width)=>scatterPlot1(scatter_data, {width}))}

  </div>
</div>


<!-- Example of a better lines -->
```js
function summarizeEspecialidad(data, especialidadId, decimals=2) {

  function roundTo(v, n = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return null;
  }
  return Number(v.toFixed(n));
}

  const filtered = data.filter(d => d.especialidad_id === especialidadId);

  const puntajeMinList = filtered.map(d => roundTo(d.puntaje_min));
  const puntajeMaxList = filtered.map(d => roundTo(d.puntaje_max));
  const stdPlusList    = filtered.map(d => roundTo(d.std_puntaje_min_plus_1));
  const stdMinusList   = filtered.map(d => roundTo(d.std_puntaje_min_minus_1));
  const yearList  = filtered.map(item => item.year);

  // 3. Compute max and average of puntaje_max
  const maxPuntajeMax = puntajeMaxList.length
    ? Math.max(...puntajeMaxList)
    : null;

  const avgPuntajeMax = puntajeMaxList.length
    ? roundTo(puntajeMaxList.reduce((sum, v) => sum + v, 0) / puntajeMaxList.length,2)
    : null;

  // 4. Compute median of puntaje_max
  let medianPuntajeMax = null;
  if (puntajeMaxList.length) {
    const sorted = [...puntajeMaxList].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) {
      medianPuntajeMax = sorted[mid];
    } else {
      medianPuntajeMax = (sorted[mid - 1] + sorted[mid]) / 2;
    }
  }

  // 5. Return the summary object
  return {
    puntajeMinList,
    puntajeMaxList,
    stdPlusList,
    stdMinusList,
    maxPuntajeMax,
    avgPuntajeMax,
    medianPuntajeMax,
    yearList
  };
}
```

```js
function findOverallRange(data) {
  // extract all numeric puntaje_min and puntaje_max values
  const mins = data
    .map(item => item.puntaje_min)
    .filter(v => typeof v === 'number' && !isNaN(v));
  const maxs = data
    .map(item => item.puntaje_max)
    .filter(v => typeof v === 'number' && !isNaN(v));

  // if no valid entries, return null
  if (!mins.length || !maxs.length) {
    return { overallMin: null, overallMax: null };
  }

  // compute overall min and max
  const overallMin = Math.min(...mins);
  const overallMax = Math.max(...maxs);

  return { overallMin, overallMax };
}
```

```js
let spo = {}

for(let special=0; special < listOfSpecialties.length; special++){
  let nameOfSpecial = listOfSpecialties[special]['especialidad_id']
  let d = `${nameOfSpecial}`

  let specialtySummary = summarizeEspecialidad(all_specs_df, d)
  spo[d] = specialtySummary

}

let baseLineNumbers = findOverallRange(all_specs_df)
```

```js
function SpecialtiesChart1(summaries, thresholds, { title = "Puntaje Mínimo ENARM", ...options } = {}) {
  // color scale for one line per specialty
  const color = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(Object.keys(summaries));

  // start with the two horizontal rules
  const mark1 = [
    Plot.ruleY([thresholds.overallMin, thresholds.overallMax], {
      stroke: "#444",
      strokeDasharray: "0,1"
    })
  ];

  // add one line per specialty
  Object.entries(summaries).forEach(([especialidad, summary]) => {
    // zip yearList & puntajeMinList into an array of {year, puntaje_min}
    const series = summary.yearList.map((year, i) => ({
      year,
      puntaje_min: summary.puntajeMinList[i]
    }));

    mark1.push(
      Plot.lineY(series, {
        x: "year",
        y: "puntaje_min",
        stroke: color(especialidad),
        curve: "catmull-rom"
      })
    );
  });


  return Plot.plot({
    ...options,
    height: 400,
    width: 700,
    grid: true,
    inset: 10,
    marks:mark1
  });
}

```

<!-- 
```js
SpecialtiesChart1(spo, baseLineNumbers)
``` -->


<!-- especialidad_id, 
year, 
puntaje_min,
avg_puntaje_min,
avg_puntaje_min + std_puntaje_min AS std_puntaje_min_plus_1,
avg_puntaje_min - std_puntaje_min AS std_puntaje_min_minus_1,
puntaje_max,
avg_puntaje_max,
avg_puntaje_max + std_puntaje_max AS std_puntaje_max_plus_1,
avg_puntaje_max - std_puntaje_max AS std_puntaje_max_minus_1,
diff -->
