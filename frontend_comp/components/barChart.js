import * as Plot from "npm:@observablehq/plot";

export function BarChart(data,baseline, {width} = {}) {
    return Plot.plot({
    width,
    marginTop: 30,
    marginRight: 20,
    marginBottom: 100,
    marginLeft: 60,
    height: 400,
    grid: true,
    marks: [
      Plot.ruleY([baseline]),
      Plot.barY(data, {
        x: "x",
        y: "y",
        fill: "steelblue"
      }),
      Plot.text(data, {
        x: "x",
        y: "y",
        text: d => d.y,
        dy: -6, // Move label above the bar
        fill: "white",
        fontSize: 10,
        textAnchor: "middle"
      }),
      Plot.frame()
    ],
    y: {
      label: "# of Sustentantes",
      grid: 5
    },
    x: {
      type: "band",
      label: "dateofrequest",
      tickRotate: -90 
    }
    })
}