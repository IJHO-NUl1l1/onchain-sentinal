import { setPolicyFor } from "../executors/flare";

const XRP_USD_FEED_ID = "0x015852502f55534400000000000000000000000000";
const thresholdBips = BigInt(process.argv[2] ?? "3");

setPolicyFor(XRP_USD_FEED_ID, thresholdBips).then((r) => console.log(r));
