import * as Plot from "npm:@observablehq/plot";

export function DateTrend(data,baseline, {width} = {}){
        return Plot.plot({
        width,
        marginTop: 40,
        marginLeft: 60,
        marginBottom: 100,
        height: 400,
        width: width,
        y: {grid: true, label: "Sustentantes"},
        x: {
          type: "point", 
            label: "Fecha",
          tickRotate: -90,
          tickFormat: (d, i) => i % 1 === 0 ? d : ""
        },
        color: {
        //   legend: true,
        //   domain: ["Daily Shows"],
        //   range: ["#ff8ab7"]
        },
        grid: true,
        marks: [
          Plot.ruleY([baseline], {stroke: "#444", strokeDasharray: "2,2"}),
                  Plot.lineY(data, { x: "x", y: "y", stroke: "#ff8ab7",curve: "catmull-rom" }),
                  Plot.lineY(data, { x: "x", y: "y_rolling_avg_3",
                    stroke: "white",strokeOpacity: 0.2 }),
                  Plot.lineY(data, { x: "x", y: "y_mean", stroke: "gray",
                    strokeOpacity: 0.6,
                    strokeDasharray: "4,4"}),
                  Plot.lineY(data, { x: "x", y: "y_std_dev_plus_1_5",
                    stroke: "green",
                    strokeDasharray: "4,4" }),
                  Plot.lineY(data, { x: "x", y: "y_std_dev_minus_1_5",
                    stroke: "red",
                    strokeDasharray: "4,4" }),
          Plot.ruleX(
            data,
            Plot.pointerX({
              x: "x",
              strokeDasharray: [2, 2],
              channels: {
                date: {value: "x", label: "Date"},
                shows: {value: "y", label: "Sustentantes"},
                rolling_avg_6d: {value: "y_rolling_avg_3", label: "Rolling Avg."},
                avg_shows: {value: "y_mean", label: "Avg"},
                std_dev_plus_1_5: {value: "y_std_dev_plus_1_5", label: "+1.5 Std Dev"},
                std_dev_minus_1_5: {value: "y_std_dev_minus_1_5", label: "-1.5 Std Dev"},
              },
              tip: {
            html: d => `
              <div style="font-family:sans-serif; font-size:13px;">
                <strong>Sustentantes:</strong> ${Math.round(d.y)}<br/>
              </div>
            `
          }
            })
          )
        ]
      })
}