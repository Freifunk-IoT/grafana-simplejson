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

app.use(async (ctx, next) => {
   ctx.set('WWW-Authenticate', 'Basic realm="grafana", enc=utf-8');
   ctx.state.no_json = true;
   let auth_header: string = ctx.headers.authorization;
   let unauth_err = new HttpError("Unauthorized", HttpStatusCode.UNAUTHORIZED);
   if (!auth_header) throw unauth_err;
   let [basic, cred] = auth_header.split(" ");
   if (basic.toLowerCase() !== "basic") {
      throw unauth_err
   }

   let [username, password] = Buffer.from(cred, "base64").toString("utf8").split(":", 2);
   if (!username || !password) throw unauth_err;
   if (username !== config.web.username || password !== config.web.password) throw unauth_err;
   return next()
})

import * as Router from "koa-router";
const router = new Router();

router.all("/", ctx => {
   ctx.body = { success: true };
})

router.all("/search", async ctx => {
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
import { HttpError, HttpStatusCode } from "./errors";
router.all("/query", async ctx => {
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
      prs = prs.slice(prs.length - max, prs.length);
   }

   let data = await Promise.all(prs);
   ctx.body = data;
})

router.all("/annotations", ctx => {
   Logging.debug("annotations \n", ctx.request.body);
   ctx.body = { error: true };
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(config.web.port, config.web.host, () => {
   Logging.log("Listening on port", config.web.port);
})