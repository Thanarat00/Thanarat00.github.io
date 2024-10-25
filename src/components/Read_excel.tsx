import React, { useState, useEffect, useRef } from 'react';
import Highcharts, { Chart } from 'highcharts';
import 'highcharts/modules/exporting';
import Papa from 'papaparse';
import flagsData from "../assets/flags.json";
import { ContinentVisibility } from '../Type/excel.type';
import countriesList from "../countries/countries";
import { FaPlay } from "react-icons/fa";
import { TbPlayerPauseFilled } from "react-icons/tb";

interface PopulationData {
  country: string;
  year: number;
  population: number;
  image: string;
}

const PopulationChart: React.FC = () => {
  const startYear = 1950;
  const endYear = 2021;
  const nbr = 12;

  const [dataset, setDataset] = useState<PopulationData[]>([]);
  const [chart, setChart] = useState<Chart | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(startYear);
  const [playPauseButton, setPlayPauseButton] = useState(false)
  // const playPauseButton = useRef<HTMLButtonElement | null>(null);
  const playRange = useRef<HTMLInputElement | null>(null);
  const [visibleContinents, setVisibleContinents] = useState<ContinentVisibility>({
    Asia: true,
    Europe: true,
    America: true,
    Africa: true,
    Oceania: true,
  });

  const continentColors: Record<string, string> = {
    Asia: "#664df6",
    Europe: "#9965d9",
    Africa: "#ae5fbc",
    Oceania: "#ebac26",
    America: "#fff322",
  };

  const continentMap: Record<string, keyof ContinentVisibility> = Object.fromEntries(
    Object.entries(countriesList).flatMap(([continent, countries]) =>
      countries.map((country) => [country, continent as keyof ContinentVisibility])
    )
  );

  useEffect(() => {
    (function (H) {
      const FLOAT = /^-?\d+\.?\d*$/;

      H.Fx.prototype.textSetter = function () {
        let startValue = this.start.replace(/ /g, '');
        let endValue = this.end.replace(/ /g, '');
        let currentValue = this.end.replace(/ /g, '');

        if ((startValue || '').match(FLOAT)) {
          startValue = parseInt(startValue, 10);
          endValue = parseInt(endValue, 10);
          currentValue = Highcharts.numberFormat(
            Math.round(startValue + (endValue - startValue) * this.pos),
            0
          );
        }


        this.elem.endText = this.end;
        this.elem.attr(this.prop, currentValue, null, true);
      };

      H.SVGElement.prototype.textGetter = function () {
        const ct = this.text.element.textContent || '';
        return this.endText ? this.endText : ct.substring(0, ct.length / 2);
      };

      H.wrap(H.Series.prototype, 'drawDataLabels', function (proceed) {
        const attr = H.SVGElement.prototype.attr;
        const chart = this.chart;
        if (chart.sequenceTimer) {
          this.points.forEach((point) =>
            (point.dataLabels || []).forEach((label) => {
              label.attr = function (hash) {
                if (hash && hash.text !== undefined && chart.isResizing === 0) {
                  const text = hash.text;
                  delete hash.text;
                  return this.attr(hash).animate({ text });
                }
                return attr.apply(this, arguments);
              };
            })
          );
        }

        const ret = proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        this.points.forEach((p) =>
          (p.dataLabels || []).forEach((d) => (d.attr = attr))
        );
        return ret;
      });

    })(Highcharts);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/excel/population-and-demography.csv');
        if (!response.ok) throw new Error('Network response was not ok');

        const textData = await response.text();

        Papa.parse(textData, {
          header: true,
          complete: (results) => {
            const parsedData = results.data.map((item: any) => {
              const countryName = item['Country name'];
              const year = Number(item['Year']);
              const population = Number(item['Population']);
              const flag = flagsData.find((flag) => flag.title === countryName);
              const image = flag ? flag.src : '';

              return {
                country: countryName,
                year,
                population,
                color: continentColors[continentMap[countryName]],
                image,
              };
            });

            setDataset(parsedData);
          },
        });
      } catch (error) {
        console.error('Error fetching or parsing CSV:', error);
      }
    };

    fetchData();
  }, []);


  useEffect(() => {
    if (dataset.length > 0) {
        const initChart = Highcharts.chart('container', {
          chart: {
            animation: { duration: 500 },
            marginRight: 50,
            events: {
              load: function () {
                loadImage(this)
              },
              // เมื่อกราฟถูกอัปเดต
              afterRedraw: function () {
                loadImage(this); 
              }
            },
          },
          title: { text: null },
          subtitle: {
            useHTML: true,
            floating: true,
            text: getSubtitle(),
            dataSorting: { enabled: true, matchByName: true },
            dataLabels: {
              enabled: true,
              useHTML: true,
            },
            align: 'right',
            verticalAlign: 'bottom',
            y: 0,
            x: -100,
          },
          legend: { enabled: false },
          xAxis: { type: 'category' },
          yAxis: {
            opposite: true,
            tickPixelInterval: 150,
            title: { text: null },
          },
          tooltip: {
            useHTML: true,
            formatter: function () {
              const imageUrl = this.point.image; // Get the image URL from the point data
              return `
              <div style="display: flex; align-items: center;">
                <img src="${imageUrl}" style="width: 40px; height: 40px; margin-right: 10px;"/>
                <div>
                  <b>${this.point.name}</b><br/>
                  Population: ${this.y}
                </div>
              </div>
            `; // Adjust size as needed
            },
          },
          plotOptions: {
            series: {
              animation: true,
              groupPadding: 0,
              pointPadding: 0.1,
              borderWidth: 0,
              colorByPoint: true,
              dataSorting: { enabled: true, matchByName: true },
              type: 'bar',
              dataLabels: {
                enabled: true,

              },
            },
          },
          series: [{
            type: 'bar',
            name: startYear.toString(),
            data: getData(startYear).map((item) => ({
              name: item.country,
              y: item.population,
              color: item.color,
              image: item.image,
            })),
          }],
          responsive: {
            rules: [{
              condition: { maxWidth: 550 },
              chartOptions: {
                xAxis: { visible: false },
                subtitle: { x: 0 },
                plotOptions: {
                  series: {
                    dataLabels: [
                      { enabled: true, y: 8 },
                      {
                        enabled: true,
                        format: '{point.name}',
                        y: -8,
                        style: { fontWeight: 'normal', opacity: 0.7 },
                      },
                    ],
                  },
                },
              },
            }],
          },
        });

        setChart(initChart);
    }
  }, [dataset]);

  const loadImage = (thiss) => {
    const charts = thiss;
    const x = charts.series[0].data
    console.log(x);
    
    const images = [];
    x.forEach((item) => {
       
      const x = item.plotX + 25;
      const y = item.plotY + 5;

       const imageUrl = item.image;
       const image = charts.renderer.image(imageUrl, x, y, 50, 50)
        .attr({
          zIndex: 5, 
          rotation: 90 
        })
        .css({ borderRadius: '50px', transition: 'all 0.65s ease' })
        .add(charts.series[0].group); 
      images.push(image);
    });


    charts.updateImages = function () {

      images.forEach((image, index) => {
        const point = charts.series[0].data;
        console.log(point);
        
        const x = point.plotX + 25;
        const y = point.plotY + 5;
        image.attr({ x, y });
      });
    };
    
  }

  const toggleContinentVisibility = (continent: keyof ContinentVisibility) => {
    setVisibleContinents((prev) => ({
      ...prev,
      [continent]: !prev[continent],
    }));
  };

  const getData = (year: number) => {
    if (dataset.length === 0 && dataset === null) return [];
    return dataset.filter((item) => item.year === year)
      .filter((country) => visibleContinents[continentMap[country.country] || ''])
      .sort((a, b) => b.population - a.population)
      .slice(0, 12);
  };

  const getSubtitle = (): string => {
    const totalPopulation = getData(currentYear).reduce((sum, country) => sum + country.population, 0);


    return `
      <span style="font-size: 80px">${currentYear}</span>
      <br>
      <span style="font-size: 22px">Total: <b>${totalPopulation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b> </span>
    `;
  };

  const pause = () => {
    // if (playPauseButton) {
    setPlayPauseButton(!playPauseButton)
    // playPauseButton.current.title = 'play';
    // playPauseButton.current.className = 'fa fa-play';
    // }
    if (chart && chart.sequenceTimer) {
      clearTimeout(chart.sequenceTimer as NodeJS.Timeout);
      chart.sequenceTimer = undefined;
    }
  };

  const play = () => {
    setPlayPauseButton(!playPauseButton)
    // if (playPauseButton) {
    //   setPlayPauseButton(true)
    // }
    if (chart) {
      chart.sequenceTimer = setInterval(() => {
        update(1);
      }, 500);
    }
  };

  // Update the current year and chart data
  const update = (increment = 0) => {
    if (playRange.current) {
      let newYear = parseInt(playRange.current.value, 10) + increment;

      if (increment) {
        playRange.current.value = newYear.toString();
      } else {
        newYear = currentYear;
      }

      if (newYear > endYear) {
        newYear = endYear;
      } else if (newYear < startYear) {
        newYear = startYear;
      }

      setCurrentYear(newYear);
    }
  };


  useEffect(() => {
    if (chart) {
      chart.series[0].setData(getData(currentYear).map((item) => ({
        name: item.country,
        y: item.population,
        color: item.color,
      })));
      chart.setSubtitle({ text: getSubtitle() });

      chart.updateImages()
      
    }
  }, [currentYear, visibleContinents]);



  return (
    <div>
      <div className="play-controls">
        <input
          id='play-range'
          type="range"
          ref={playRange}
          min={startYear}
          max={endYear}
          defaultValue={startYear}
          onChange={() => update(0)} // Update without increment
        />
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "20px",
            }}
          >
            Population growth per country 1950 to 2021
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button id="play-pause-button" onClick={() => (chart?.sequenceTimer ? pause() : play())}>
              {chart?.sequenceTimer ? playPauseButton ? <TbPlayerPauseFilled /> : <FaPlay /> : <FaPlay />}
            </button>
            <span style={{ fontWeight: "bold" }}>Region:</span>
            {Object.keys(continentColors).map((continent: any) => (
              <div
                style={{ display: "flex", alignItems: "center" }}
                key={continent}
              >
                <button
                  onClick={() => toggleContinentVisibility(continent)}
                  style={{
                    backgroundColor: visibleContinents[continent]
                      ? continentColors[continent]
                      : "#ccc",
                    color: "white",
                    border: "none",
                    padding: "8px",
                    margin: "10px 5px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                ></button>
                <span>{continent}</span>
              </div>
            ))}
          </div>
          <div id="container" />
        </div>
      </div>
    </div>
  );
};

export default PopulationChart;
