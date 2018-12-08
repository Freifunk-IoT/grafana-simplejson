import { HttpError, HttpStatusCode } from "./errors";
import Logging from "@hibas123/nodelogging";
export default function RequestError(ctx, next) {
   function reply(status, message) {
      if (ctx.accepts(["json"]) && !ctx.state.no_json) {
         ctx.status = 200;
         ctx.body = { message, status };
      } else {
         ctx.status = status;
         ctx.body = message;
      }
   }

   return next().then(() => {
      if (ctx.status === HttpStatusCode.NOT_FOUND) {
         reply(HttpStatusCode.NOT_FOUND, "Not found");
      }
   }).catch(error => {
      let message = "Internal server error";
      let status = HttpStatusCode.INTERNAL_SERVER_ERROR;
      if (typeof error === "string") {
         message = error;
      } else if (!(error instanceof HttpError)) {
         Logging.error(error);
         message = error.message;
      } else {
         if (error.status === HttpStatusCode.INTERNAL_SERVER_ERROR) {
            //If internal server error log whole error
            Logging.error(error);
         }
         else {
            message = error.message.split("\n", 1)[0];
            Logging.errorMessage(message);
         }
         status = error.status;
      }
      reply(status, message);
   })
};