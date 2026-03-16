<p align="center">
  <img src=".github/logo.svg" width="80" height="80" alt="limit logo">
</p>

<h1 align="center">@prsm/limit</h1>

Redis-backed distributed rate limiting with token bucket, sliding window, and leaky bucket algorithms.

## Installation

```bash
npm install @prsm/limit
```

## Algorithms

| Algorithm          | Burst               | Use case                              |
| ------------------ | ------------------- | ------------------------------------- |
| **Token bucket**   | Yes, up to capacity | API rate limits with burst allowance  |
| **Sliding window** | No                  | Strict "N requests per minute" limits |
| **Leaky bucket**   | No                  | Smooth, constant-rate enforcement     |

All three are fully distributed via Redis Lua scripts - safe to use across multiple servers.

## Token Bucket

Tokens refill at a steady rate. Allows bursts up to the bucket capacity.

```js
import { tokenBucket } from '@prsm/limit'

const limiter = tokenBucket({
  capacity: 100, // max tokens
  refillRate: 10, // tokens added per interval
  refillInterval: '1s', // refill every second
})

const result = await limiter.take('tenant-123')
// { allowed: true, remaining: 99, retryAfter: 0 }

const result = await limiter.take('tenant-123', 5) // take 5 tokens
// { allowed: true, remaining: 94, retryAfter: 0 }

const result = await limiter.take('tenant-123') // exhausted
// { allowed: false, remaining: 0, retryAfter: 100 }

await limiter.close()
```

## Sliding Window

Counts requests in a rolling time window. No bursts - once you hit the limit, you wait for the oldest entry to expire.

```js
import { slidingWindow } from '@prsm/limit'

const limiter = slidingWindow({
  max: 100, // max requests per window
  window: '1m', // rolling 1-minute window
})

const result = await limiter.hit('tenant-123')
// { allowed: true, remaining: 99, retryAfter: 0, total: 1 }

const result = await limiter.hit('tenant-123') // at limit
// { allowed: false, remaining: 0, retryAfter: 42150, total: 100 }

await limiter.close()
```

## Leaky Bucket

Requests fill a bucket that drains at a constant rate. Smooths traffic - no bursting past the drain rate.

```js
import { leakyBucket } from '@prsm/limit'

const limiter = leakyBucket({
  capacity: 10, // max queued before rejection
  drainRate: 1, // drained per interval
  drainInterval: '100ms', // drain every 100ms
})

const result = await limiter.drip('tenant-123')
// { allowed: true, remaining: 9, retryAfter: 0 }

const result = await limiter.drip('tenant-123') // bucket full
// { allowed: false, remaining: 0, retryAfter: 100 }

await limiter.close()
```

## Shared API

All three limiters share the same shape:

```js
await limiter.take(key, cost?)  // token bucket
await limiter.hit(key, cost?)   // sliding window
await limiter.drip(key, cost?)  // leaky bucket
```

Every response includes:

| Field        | Description                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- |
| `allowed`    | Whether the request was permitted                                                             |
| `remaining`  | Tokens/slots/capacity left                                                                    |
| `retryAfter` | Milliseconds until the next request would succeed (0 if allowed, -1 if cost exceeds capacity) |

Additional methods on all limiters:

```js
await limiter.peek(key) // check state without consuming
await limiter.reset(key) // clear a key's state
await limiter.close() // disconnect from Redis
```

## Options

All limiters accept `redis` and `prefix` options:

```js
const limiter = tokenBucket({
  capacity: 100,
  refillRate: 10,
  refillInterval: '1s',

  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
  },

  prefix: 'myapp:ratelimit:', // default varies by algorithm
})
```

Default key prefixes: `limit:tb:`, `limit:sw:`, `limit:lb:`.

## Express Middleware Example

```js
import { slidingWindow } from '@prsm/limit'

const limiter = slidingWindow({ max: 100, window: '1m' })

app.use(async (req, res, next) => {
  const key = req.ip
  const result = await limiter.hit(key)

  res.set('X-RateLimit-Remaining', result.remaining)

  if (!result.allowed) {
    res.set('Retry-After', Math.ceil(result.retryAfter / 1000))
    return res.status(429).json({ error: 'Too many requests' })
  }

  next()
})
```

## Per-Tenant Throttling with [queue](https://github.com/nvms/queue)

Use with @prsm/queue to gate work based on external API limits:

```js
import Queue from '@prsm/queue'
import { tokenBucket } from '@prsm/limit'

const limiter = tokenBucket({
  capacity: 20,
  refillRate: 20,
  refillInterval: '1s',
  redis: { host: 'localhost', port: 6379 },
})

const queue = new Queue({
  concurrency: 10,
  groups: { concurrency: 2 },
})

queue.process(async (payload, task) => {
  const key = task.groupKey
  let result = await limiter.take(key)

  while (!result.allowed) {
    await new Promise((r) => setTimeout(r, result.retryAfter))
    result = await limiter.take(key)
  }

  return await callExternalAPI(payload)
})
```

## Horizontal Scaling

All state lives in Redis. Multiple servers can share the same limiter keys - Redis Lua scripts guarantee atomicity. No coordination needed.

Keys auto-expire when unused to prevent stale accumulation.

## License

MIT
