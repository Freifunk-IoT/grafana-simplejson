import Logging from "@hibas123/nodelogging";
Logging.log("Starting Grafana SimpleJSON-Provider")

import config from "./config";

import * as Koa from "koa";
const app = new Koa();

import RequestLog from "./RequestLog";
app.use(RequestLog);

import RequestError from "./RequestError";
app.use(RequestError);

import * as koaBody from "koa-body";
app.use(koaBody());

import { escape, InfluxDB } from "influx"
const database = new InfluxDB({
   database: config.database.database,
   host: config.database.host
})
database.createDatabase(config.database.database);

import * as Router from "koa-router";
const router = new Router();

router.post("/", ctx => {
   ctx.body = { success: true };
})

router.post("/search", async ctx => {
   let target = ctx.request.body.target
   if (target) {
      let channels = await database.query(`SHOW FIELD KEYS FROM ${escape.tag(target)}`);
      ctx.body = channels.map((e: any) => e.fieldKey);
   } else {
      let series = await database.getSeries();
      ctx.body = series;
   }
})
import * as moment from "moment";
router.post("/query", async ctx => {
   let query: Query = ctx.request.body;

   let from = query.range.from;
   let to = query.range.to;

   // let interval = query.interval;
   let max = query.maxDataPoints;

   let prs = query.targets.map(async t => {
      let [target, channel] = t.target.split(".")
      let r = await database.query(`SELECT ${escape.tag(channel)} FROM ${escape.tag(target)} WHERE time < '${to}' AND time > '${from}'`)

      return {
         target: t.target,
         datapoints: r.map((e: any) => [e[channel], moment(e.time).valueOf()])
      }
   })

   if (prs.length > max) {
      //TODO: remove oldest
      prs = prs.slice(0, prs.length);
   }

   let data = await Promise.all(prs);
   ctx.body = data;
})

router.post("/annotations", ctx => {
   Logging.debug("annotations \n", ctx.request.body);
   ctx.body = { error: true };
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(config.web.port, config.web.host, () => {
   Logging.log("Listening on port", config.web.port);
})