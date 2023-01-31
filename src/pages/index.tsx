import Head from "next/head";
import styles from "@/styles/Home.module.css";
import type { GoogleSheetResponse } from "@/types/google";
import { DateTime } from "luxon";
import { ResponsiveTimeRange } from "@nivo/calendar";

export default function Home({
  names,
  checkins,
  days,
}: {
  names: string[];
  checkins: boolean[][];
  days: string[];
}) {
  const calendarData = checkins.reduce((data, checkins, i) => {
    return [
      ...data,
      {
        day: days[i],
        value: checkins.filter((x) => x).length,
      },
    ];
  }, [] as { day: string; value: number }[]);
  return (
    <>
      <Head>
        <title>Winter Challenge</title>
        <meta name="description" content="Charts around the winter challenge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.calendar}>
          <ResponsiveTimeRange
            data={calendarData}
            from={days[0]}
            to={days[days.length - 1]}
            emptyColor="#eeeeee"
            colors={["#e0d39a", "#8bad83", "#458376", "#185662", "#0f2b3f"]}
            dayRadius={8}
            dayBorderWidth={4}
            dayBorderColor="#ffffff"
            tooltip={({ day }) => {
              const i = calendarData.findIndex(({ day: cDay }) => cDay === day);
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
            legends={[
              {
                anchor: "bottom-right",
                direction: "row",
                justify: false,
                itemCount: 5,
                itemWidth: 42,
                itemHeight: 36,
                itemsSpacing: 14,
                itemDirection: "right-to-left",
                symbolSize: 20,
              },
            ]}
          />
        </div>
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
