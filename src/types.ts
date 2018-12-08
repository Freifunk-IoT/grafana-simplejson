interface Query {
   panelId: number;
   range: { from: string, to: string, raw: { from: string, to: string } };
   rangeRaw: { from: string, to: string };
   interval: string;
   intervalMs: number;
   targets: { target: string, refId: string, type: "timeserie" | "table" }[];
   adhocFilters: [{ key: string, operator: string, value: string }];
   format: "json";
   maxDataPoints: number;
}

type QueryResponseTimes = { target: string, datapoints: any[][] }[]
type QueryResponseTable = {
   columns: { text: string, type: string }[],
   rows: any[][],
   type: "table"
}[]