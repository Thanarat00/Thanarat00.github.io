
import { useState, useEffect, useRef } from "react";
import { ContinentVisibility, CountryData } from "../Type/excel.type";
import { FaPlay } from "react-icons/fa";
import { TbPlayerPauseFilled } from "react-icons/tb";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import Papa from "papaparse";
import countriesList from "../countries/countries";
import flagsData from "../assets/flags.json";

const Read_excel = () => {
  const [excelData, setExcelData] = useState<CountryData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(1950);
  const [populationData, setPopulationData] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const chartRef = useRef(null);
  const [visibleContinents, setVisibleContinents] = useState<
    ContinentVisibility | any
  >({
    Asia: true,
    Europe: true,
    America: true,
    Africa: true,
    Oceania: true,
  });

  const continentMap: Record<string, keyof ContinentVisibility> =
    Object.fromEntries(
      Object.entries(countriesList).flatMap(([continent, countries]) =>
        countries.map((country) => [
          country,
          continent as keyof ContinentVisibility,
        ])
      )
    );

  useEffect(() => {
    const fetchExcelFile = async () => {
      try {
        const response = await fetch("/excel/population-and-demography.csv");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const textData = await response.text();
        Papa.parse(textData, {
          header: true,
          complete: (results) => {
            const country = results.data.map((i: any) => {
              const CountryName = i["Country name"];
              const year = i["Year"];
              const population = i["Population"];
              const totalpopulation = Number(population);
              const flag = flagsData.find((flag) => flag.title === CountryName);
              const image = flag ? flag.src : "";

              return {
                country: CountryName,
                year: Number(year),
                population: totalpopulation,
                // continent: continentMap[CountryName],
                image: image,
              };
            });
            setExcelData(country);
          },
        });
      } catch (error) {
        console.error("Error fetching the CSV file:", error);
      }
    };

    fetchExcelFile();
  }, []);

  
  useEffect(() => {
    if (!isAnimating || selectedYear >= 2021) {
      if (selectedYear === 2021) {
        setIsAnimating(false);
      }
      return;
    }
  
    const nextYear = selectedYear + 1;
    const newPopulationData = getPopulationData(nextYear);
  
    const interval = setInterval(() => {
      animatePopulationData(populationData, newPopulationData);
      setSelectedYear(nextYear);
    }, 500);

    return () => clearInterval(interval);
  }, [isAnimating, selectedYear, populationData]); 
  

  const continentColors: Record<string, string> = {
    Asia: "#664df6",
    Europe: "#9965d9",
    Africa: "#ae5fbc",
    Oceania: "#ebac26",
    America: "#fff322",
  };

  const countries = [...new Set(excelData.map((item) => item.country))];

  const getPopulationData = (year: number) => {
    const data = excelData.filter((item) => item.year === year);
    return countries
      .filter((country) => visibleContinents[continentMap[country]])
      .map((country) => {
        const record = data.find((item) => item.country === country);
        return record ? record.population : 0;
      });
  };

  const sortedPopulationData = populationData.length > 0? populationData: getPopulationData(selectedYear);
  const countriesWithPopulation = countries.filter((country) => visibleContinents[continentMap[country]]).map((country, index) => ({country, population: sortedPopulationData[index], })).sort((a, b) => b.population - a.population).slice(0, 12);
  const sortedPopulations = countriesWithPopulation.map((item) => item.population );
  const totalPopulation = sortedPopulations.reduce((total, num) => total + num, 0);
  const outputArray = Object.values(countriesWithPopulation).map((item) => {
    const continent = continentMap[item.country];
    const flag = flagsData.find((flag) => flag.title === item.country);
    const image = flag ? flag.src : ""; 
    return [
      item.country,
      item.population,
      { color: continentColors[continent]  , image} // Add color here
    ];
  });

  const toggleContinentVisibility = (continent: keyof ContinentVisibility) => {
    setVisibleContinents((prev: any) => ({
      ...prev,
      [continent]: !prev[continent],
    }));
  };

  const handleClick = () => {
    setIsAnimating(!isAnimating);
  };

  const getSubtitle = () => {
    if (!excelData) return "";
    return `<span style="font-size: 80px">${selectedYear}</span>
        <br>
        <span style="font-size: 22px">
            Total: <b>${totalPopulation.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}</b>
        </span>`;
  };

  const animatePopulationData = (startData: number[], endData: number[]) => {
    const steps = 100; 
    const increment = endData.map((end, index) => (end - startData[index]) / steps);
    let currentStep = 0;
  
    const animate = () => {
      // Animate the data until the current step exceeds the number of steps
      if (currentStep < steps) {
        const updatedData = startData.map((start, index) => Math.round(start + increment[index] * currentStep));
        setPopulationData(updatedData);
        currentStep++;
        requestAnimationFrame(animate);
      } else {
        // When finished, set the population data to endData
        setPopulationData(endData);
      }
    };
  
    animate(); 
  };

  
  const chartOptions = {
    chart: {
      animation: true,
      height: '40%', 
    },
    subtitle: {
      useHTML: true,
      text: getSubtitle(),
      floating: true,
      align: "right",
      verticalAlign: "bottom",
      y: 0,
      x: -100,
    },
    legend: {
      enabled: false,
    },
    xAxis: {
      type: "category",
    },
    yAxis: {
      opposite: true,
      tickPixelInterval: 150,
      title: {
        text: null,
      },
    },
    plotOptions: {
      series: {
        animation: {
          duration: 500
        },
        groupPadding: 0,
        pointPadding: 0.1,
        borderWidth: 0,
        colorByPoint: true,
        dataSorting: {
          enabled: true,
          matchByName: true,
        },
        type: "bar",
        dataLabels: {
          enabled: true,
        },
      },
    },
    series: [
      {
        type: "bar",
        name: selectedYear.toString(),
        data: outputArray.map(([country, population, color]) => ({
          name: country,
          y: population,
          color: color.color, // Apply the continent color here
          image: color.image // Include the image here
        })),
        dataLabels: {
          enabled: true,
          useHTML: true,
          formatter: function () {
            return `
              <div style="display: flex; align-items: center; ">
                <img src="${this.point.image}" alt="${this.point.name}" style="width: 20px; height: 20px; margin-right: 5px;" />
                ${this.y.toLocaleString()}
              </div>
            `;
          },
        },
        
      },
    ],
    responsive: {
      rules: [{
          condition: {
              maxWidth: 550
          },
          chartOptions: {
              xAxis: {
                  visible: false
              },
              subtitle: {
                  x: 0
              },
              plotOptions: {
                  series: {
                      dataLabels: [{
                          enabled: true,
                          y: 8
                      }, {
                          enabled: true,
                          format: '{point.name}',
                          y: -8,
                          style: {
                              fontWeight: 'normal',
                              opacity: 0.7
                          }
                      }]
                  }
              }
          }
      }]
  }
  };
  

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 70px)",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
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
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <button
          style={{
            padding: "10px",
            fontSize: "16px",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.6)",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={handleClick}
        >
          {isAnimating ? (
            <TbPlayerPauseFilled style={{ color: "#fff" }} />
          ) : (
            <FaPlay style={{ color: "#fff" }} />
          )}
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
      </div>

      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <HighchartsReact
          highcharts={Highcharts}
          options={chartOptions}
          ref={chartRef}
        
        />

      </div>
    </div>
  );
};

export default Read_excel;


