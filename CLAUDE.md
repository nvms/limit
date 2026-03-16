# @prsm/limit

redis-backed distributed rate limiting with token bucket, sliding window, and leaky bucket algorithms.

## structure

```
src/
  index.js          - named exports for all three algorithms
  tokenBucket.js    - token bucket limiter
  slidingWindow.js  - sliding window limiter
  leakyBucket.js    - leaky bucket limiter
tests/
  tokenBucket.test.js
  slidingWindow.test.js
  leakyBucket.test.js
```

## dev

```
make up        # start redis via docker compose
make test      # run tests
make down      # stop redis
```

redis must be running on localhost:6379 for tests.

## key decisions

- plain javascript, ESM, no build step
- each algorithm is a standalone module with a factory function
- all state lives in Redis - fully distributed, no local state
- uses `redis` npm package (node-redis), not ioredis
- `@prsm/ms` for parsing duration strings ("100ms", "5s", "1m")
- types generated from JSDoc via `make types`
- all Redis operations use Lua scripts for atomicity

## testing

tests use vitest. each test flushes redis in beforeEach. sequential execution.

## publishing

```
npm publish --access public
```

prepublishOnly generates types automatically.
