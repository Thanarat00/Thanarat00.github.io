import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { ContinentVisibility, CountryData } from "../Type/excel.type";
import { FaPlay } from "react-icons/fa";
import { TbPlayerPauseFilled } from "react-icons/tb";
import Papa from "papaparse";
import countriesList from "../countries/countries";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const drawBarValues = {
  id: "drawBarValues",
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value !== null) {
          const xPos = bar.x + 10;
          const yPos = bar.y + 5;
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.font = "bold 12px Arial";
          ctx.fillText(
            value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            xPos,
            yPos - 5
          );
        }
      });
    });
  },
};

ChartJS.register(drawBarValues);

const Read_excel = () => {
  const [excelData, setExcelData] = useState<CountryData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(1950);
  const [populationData, setPopulationData] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([1950]);
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

              return {
                country: CountryName,
                year: Number(year),
                population: totalpopulation,
                continent: continentMap[CountryName],
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

  const sortedPopulationData =
    populationData.length > 0
      ? populationData
      : getPopulationData(selectedYear);
  const countriesWithPopulation = countries
    .filter((country) => visibleContinents[continentMap[country]])
    .map((country, index) => ({
      country,
      population: sortedPopulationData[index],
    }))
    .sort((a, b) => b.population - a.population)
    .slice(0, 12);
  const sortedCountries = countriesWithPopulation.map((item) => item.country);
  const sortedPopulations = countriesWithPopulation.map(
    (item) => item.population
  );
  const totalPopulation = sortedPopulations.reduce(
    (total, num) => total + num,
    0
  );

  const animatePopulationData = (startData: number[], endData: number[]) => {
    const steps = 100;
    const increment = endData.map(
      (end, index) => (end - startData[index]) / steps
    );
    let currentStep = 0;
    const animate = () => {
      if (currentStep >= steps) {
        setPopulationData(endData);
        return;
      }
      setPopulationData(
        startData.map((start, index) =>
          Math.round(start + increment[index] * currentStep)
        )
      );
      currentStep++;
      requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    if (!isAnimating) return;
    if (selectedYear === 2021) {
      setIsAnimating(false);
      return;
    }
    const interval = setInterval(() => {
      const nextYear = selectedYear + 1;
      const newPopulationData = getPopulationData(nextYear);
      animatePopulationData(populationData, newPopulationData);
      setSelectedYear(nextYear);
      setSelectedYears((prvData) => [...prvData, selectedYear + 1]);
    }, 100);

    return () => clearInterval(interval);
  }, [selectedYear, populationData, isAnimating]);

  const toggleContinentVisibility = (continent: keyof ContinentVisibility) => {
    setVisibleContinents((prev: any) => ({
      ...prev,
      [continent]: !prev[continent],
    }));
  };

  const handleClick = () => {
    setIsAnimating(!isAnimating);
  };

  const datasets = [
    {
      label: null,
      data: sortedPopulations,
      backgroundColor: sortedCountries.map(
        (country) => continentColors[continentMap[country]]
      ),
      borderColor: sortedCountries.map((country) =>
        continentColors[continentMap[country]]?.replace(/0.6/, "1")
      ),
      borderWidth: 1,
    },
  ];

  const data: any = {
    labels: sortedCountries,
    datasets: datasets,
  };

  const options: any = {
    indexAxis: "y",
    responsive: true,
    scales: {
      x: {
        position: "top",
        grid: {
          drawOnChartArea: false,
        },
      },
      x2: {
        position: "bottom",
        type: "category",
        labels: selectedYears,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
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
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          Population growth per country 1950 to 2021
        </div>



     

        <div style={{  display: "flex",     alignItems: "center", gap : 600}}>
        <button
          style={{
            padding: 10,
            fontSize: 16,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.6)", // ใช้ backgroundColor แทน background-color
            border: "none",
            borderRadius: "100%",
            cursor: "pointer",
            marginLeft: 100,
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
        <span style={{ fontWeight: "bold" }}> Region :</span>
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
                // borderRadius: "3px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            ></button>
            <span>{continent}</span>
          </div>
        ))}
      </div>
      </div>
      {/* Chart container */}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Bar
          data={data}
          options={options}
          width={window.innerWidth}
          height={window.innerHeight - 150}
        />

        <div
          style={{
            position: "absolute",
            bottom: "100px",
            right: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          {/* Selected year */}
          <p
            style={{
              fontSize: "5vw", // Default for desktop
              color: "rgba(0, 0, 0, 0.6)",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            {selectedYear}
          </p>

          {/* Total population */}
          <p
            style={{
              fontSize: "3vw", // Default for desktop
              color: "rgba(0, 0, 0, 0.6)",
              margin: 0,
            }}
          >
            Total:{" "}
            {totalPopulation.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Read_excel;
