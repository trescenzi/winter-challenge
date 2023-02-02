import { useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";
import type { GoogleSheetResponse } from "@/types/google";
import { DateTime } from "luxon";
import { ResponsiveTimeRange } from "@nivo/calendar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { schemePurples, schemeOranges } from "d3-scale-chromatic";
import { scaleOrdinal } from "d3-scale";
import contrastChecker from "wcag-color-contrast-checker";

const oranges = scaleOrdinal(schemeOranges[7]).range();
const purples = scaleOrdinal(schemePurples[7]).range();
function labelWithContrast(color: string) {
  const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!match) return "black";
  const [_, r, g, b] = match;
  return contrastChecker.checkContrast(
    { r: parseInt(r), g: parseInt(g), b: parseInt(b) },
    { r: 0, g: 0, b: 0 }
  )
    ? "black"
    : "white";
}
export default function Home({
  names,
  checkins,
  days,
}: {
  names: string[];
  checkins: boolean[][];
  days: string[];
}) {
  const [theme, setTheme] = useState<"oranges" | "purples">("oranges");
  const checkinsByDay = checkins.flatMap((c) => c.filter((x) => x).length);
  const calendarData = checkinsByDay.reduce((data, checkins, i) => {
    return [
      ...data,
      {
        day: days[i],
        value: checkins,
      },
    ];
  }, [] as { day: string; value: number }[]);
  const weekdays = days.map((day) => DateTime.fromISO(day).toFormat("EEEE"));
  const weekdayCheckins = weekdays.reduce(
    (dayIndexes, day, i) => (
      (dayIndexes[day] = dayIndexes[day] + checkinsByDay[i]), dayIndexes
    ),
    {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    } as Record<string, number>
  );
  const heatmapBase = Object.keys(weekdayCheckins).map((weekday) => ({
    id: weekday,
    data: names.map((name) => ({ x: name, y: 0 })),
  }));
  const heatmapData = weekdays.reduce((heatmap, weekday, i) => {
    const day = heatmap.findIndex(({ id }) => id === weekday);
    if (day === -1) return heatmap;
    const checkinsToday = checkins[i];
    heatmap[day].data = heatmap[day].data.map(({ x, y }, i) => ({
      x: x,
      y: y + +checkinsToday[i],
    }));
    return heatmap;
  }, heatmapBase);
  return (
    <>
      <Head>
        <title>Winter Challenge</title>
        <meta name="description" content="Charts around the winter challenge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className={styles.header}>
        <h1>Winter Challenge Data</h1>
        <label className={styles.label}>
          Theme:
          <input
            onChange={({ target: { checked } }) => {
              checked ? setTheme("purples") : setTheme("oranges");
            }}
            type="checkbox"
            className={styles.slider}
          ></input>
        </label>
      </header>
      <main className={styles.main}>
        <section>
          <h2>Checkins so far</h2>
          <figure className={styles.calendar}>
            <ResponsiveTimeRange
              data={calendarData}
              colors={theme === "oranges" ? oranges : purples}
              dayRadius={8}
              maxValue={names.length}
              dayBorderWidth={4}
              dayBorderColor="#ffffff"
              tooltip={({ day }) => {
                const i = calendarData.findIndex(
                  ({ day: cDay }) => cDay === day
                );
                const checkedIn = checkins[i].reduce(
                  (acc, checkedIn, i) => (checkedIn ? [...acc, names[i]] : acc),
                  [] as string[]
                );
                return (
                  <div className={styles.tooltip}>
                    <ul>
                      {checkedIn.map((name) => (
                        <li>{name}</li>
                      ))}
                    </ul>
                  </div>
                );
              }}
              weekdayTicks={[1, 2, 3, 4, 5, 6, 0]}
            />
          </figure>
        </section>
        <section>
          <h2>Checkins by Day</h2>
          <figure className={styles.pie}>
            <ResponsivePie
              data={Object.entries(weekdayCheckins).map(([day, checkins]) => ({
                id: day,
                value: checkins,
              }))}
              colors={{ scheme: theme }}
              innerRadius={0.7}
              padAngle={1}
              cornerRadius={4}
              margin={{ top: 75, bottom: 75, right: 75, left: 75 }}
              arcLabelsTextColor={(x) => labelWithContrast(x.color)}
            />
          </figure>
        </section>
        <section>
          <h2>Checkins by Day per Person</h2>
          <figure className={styles.heatmap}>
            <ResponsiveHeatMap
              data={heatmapData}
              margin={{ top: 75, bottom: 75, right: 75, left: 75 }}
              colors={{
                type: "sequential",
                scheme: theme,
              }}
              labelTextColor={(x) => labelWithContrast(x.color)}
            />
          </figure>
        </section>
      </main>
    </>
  );
}

const id = "1k-tnKWWB3q6XCF2ofav-yT_CGprIFMBTf9OPhvR8hlM";
async function getSheetData<T>(
  start: string,
  end: string,
  dimension: "COLUMNS" | "ROWS"
): Promise<GoogleSheetResponse<T>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Sheet1!${start}:${end}?majorDimension=${dimension}&key=${process.env.GOOGLE_API_KEY}`;
  return fetch(url).then((res) => res.json());
}

export async function getServerSideProps() {
  const firstDay = DateTime.local(2022, 11, 28);
  const now = DateTime.now();
  const length = Math.ceil(now.diff(firstDay, "days").days);
  console.log(length);
  const days = new Array(length)
    .fill(undefined)
    .map((_, i) => firstDay.plus({ days: i }).toFormat("yyyy-MM-dd"));
  const [namesData, checkinData] = await Promise.all([
    getSheetData<string>("B5", "B15", "COLUMNS"),
    getSheetData<"TRUE" | "FALSE">("C5", "DX15", "COLUMNS"),
  ]);
  const checkins = checkinData?.values?.map((day) =>
    day.map((checkin) => checkin === "TRUE")
  );
  return {
    props: {
      names: namesData?.values?.[0],
      checkins: checkins.slice(0, length),
      days,
    },
  };
}
