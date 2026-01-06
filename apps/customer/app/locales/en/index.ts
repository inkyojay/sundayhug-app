/**
 * English Translations - Combined
 */
import common from "./common";
import auth from "./auth";
import customer from "./customer";
import sleepAnalysis from "./sleep-analysis";
import warranty from "./warranty";
import chat from "./chat";
import blog from "./blog";
import errors from "./errors";

export default {
  common,
  auth,
  customer,
  "sleep-analysis": sleepAnalysis,
  warranty,
  chat,
  blog,
  errors,
} as const;
