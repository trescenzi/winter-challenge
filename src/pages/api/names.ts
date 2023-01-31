// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import type { GoogleSheetResponse } from "@/types/google";

const id = "1k-tnKWWB3q6XCF2ofav-yT_CGprIFMBTf9OPhvR8hlM";
const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Sheet1!B5:B15?majorDimension=COLUMNS&key=${process.env.GOOGLE_API_KEY}`;

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  const names = await fetch(url)
    .then((res) => res.json())
    .then((data: GoogleSheetResponse<string>) => data?.values?.[0]);
  if (names && names.length) {
    res.status(200).json(names);
  } else {
    res.status(400);
  }
}
