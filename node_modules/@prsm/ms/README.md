# @prsm/ms

Parse and convert time strings to milliseconds. Zero dependencies.

## Installation

```bash
npm install @prsm/ms
```

## Usage

```js
import ms from "@prsm/ms"

ms("1h 30m")           // 5400000
ms("15mins 12s")       // 912000
ms("1w 3d 12h")        // 907200000
ms("-30min")           // -1800000
ms(100)                // 100
```

## Options

```js
ms("10.9ms")                          // 11 (rounded by default)
ms("10.9ms", { round: false })        // 10.9

ms("1000ms", { unit: "s" })           // 1
ms("60s", { unit: "m" })              // 1
ms("90min", { unit: "h", round: false })  // 1.5
```

## Default Values

```js
ms("", 500)            // 500
ms(null, "1s")         // 1000
ms("invalid", "5m")   // 300000
```

## Supported Units

| Unit         | Aliases                                            |
|--------------|----------------------------------------------------|
| Milliseconds | `ms`, `msec`, `msecs`, `millisecond`, `milliseconds` |
| Seconds      | `s`, `sec`, `secs`, `second`, `seconds`            |
| Minutes      | `m`, `mn`, `min`, `mins`, `minute`, `minutes`      |
| Hours        | `h`, `hr`, `hrs`, `hour`, `hours`                  |
| Days         | `d`, `dy`, `day`, `days`                           |
| Weeks        | `w`, `wk`, `wks`, `week`, `weeks`                  |

## License

Apache-2.0
