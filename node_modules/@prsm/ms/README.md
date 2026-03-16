# ms

[![NPM version](https://img.shields.io/npm/v/@prsm/ms?color=a1b858&label=)](https://www.npmjs.com/package/@prsm/ms)

Confusingly, not just for converting milliseconds.

```typescript
import ms from "@prsm/ms";

ms(100); // 100
ms("100"); // 100

ms("10s"); // 10_000
ms("10sec"); // 10_000
ms("10secs"); // 10_000
ms("10second"); // 10_000
ms("10,000,000seconds"); // 10_000_000_000

ms("0h"); // 0
ms("10.9ms"); // 11
ms("10.9ms", { round: false }); // 10.9

ms("1000.9ms", { round: false, unit: "s" }); // 1.0009
ms("1000.9ms", { unit: "s" }); // 1

// All supported unit aliases:
// ms, msec, msecs, millisec, milliseconds
// s, sec, secs, second, seconds
// m, min, mins, minute, minutes
// h, hr, hrs, hour, hours
// d, day, days
// w, wk, wks, week, weeks
```
