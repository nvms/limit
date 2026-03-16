import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createClient } from "redis"
import { tokenBucket } from "../src/tokenBucket.js"

describe("tokenBucket", () => {
  let limiter
  let redis

  beforeEach(async () => {
    redis = createClient()
    await redis.connect()
    await redis.flushAll()
  })

  afterEach(async () => {
    if (limiter) await limiter.close()
    if (redis?.isOpen) await redis.quit()
  })

  it("should allow requests when bucket is full", async () => {
    limiter = tokenBucket({ capacity: 10, refillRate: 1, refillInterval: "1s" })
    const result = await limiter.take("k1")

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(result.retryAfter).toBe(0)
  })

  it("should deplete tokens with each take", async () => {
    limiter = tokenBucket({ capacity: 3, refillRate: 1, refillInterval: "1s" })

    const r1 = await limiter.take("k1")
    expect(r1.remaining).toBe(2)

    const r2 = await limiter.take("k1")
    expect(r2.remaining).toBe(1)

    const r3 = await limiter.take("k1")
    expect(r3.remaining).toBe(0)
  })

  it("should deny when tokens are exhausted", async () => {
    limiter = tokenBucket({ capacity: 2, refillRate: 1, refillInterval: "1s" })

    await limiter.take("k1")
    await limiter.take("k1")
    const result = await limiter.take("k1")

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it("should refill tokens over time", async () => {
    limiter = tokenBucket({ capacity: 5, refillRate: 5, refillInterval: 100 })

    for (let i = 0; i < 5; i++) await limiter.take("k1")
    const empty = await limiter.take("k1")
    expect(empty.allowed).toBe(false)

    await new Promise((r) => setTimeout(r, 150))

    const refilled = await limiter.take("k1")
    expect(refilled.allowed).toBe(true)
    expect(refilled.remaining).toBeGreaterThanOrEqual(0)
  })

  it("should not exceed capacity on refill", async () => {
    limiter = tokenBucket({ capacity: 5, refillRate: 10, refillInterval: 100 })

    await new Promise((r) => setTimeout(r, 200))

    const result = await limiter.peek("k1")
    expect(result.remaining).toBe(5)
  })

  it("should support burst up to capacity", async () => {
    limiter = tokenBucket({ capacity: 100, refillRate: 1, refillInterval: "1s" })

    const result = await limiter.take("k1", 100)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)

    const denied = await limiter.take("k1")
    expect(denied.allowed).toBe(false)
  })

  it("should deny when cost exceeds capacity", async () => {
    limiter = tokenBucket({ capacity: 5, refillRate: 1, refillInterval: "1s" })

    const result = await limiter.take("k1", 10)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBe(-1)
  })

  it("should return accurate retryAfter", async () => {
    limiter = tokenBucket({ capacity: 1, refillRate: 1, refillInterval: 500 })

    await limiter.take("k1")
    const immediate = await limiter.take("k1")
    expect(immediate.allowed).toBe(false)
    expect(immediate.retryAfter).toBeLessThanOrEqual(500)
    expect(immediate.retryAfter).toBeGreaterThan(450)

    await new Promise((r) => setTimeout(r, 300))
    const later = await limiter.take("k1")
    expect(later.allowed).toBe(false)
    expect(later.retryAfter).toBeLessThan(250)
    expect(later.retryAfter).toBeGreaterThan(0)
  })

  it("should peek without consuming", async () => {
    limiter = tokenBucket({ capacity: 10, refillRate: 1, refillInterval: "1s" })

    const before = await limiter.peek("k1")
    expect(before.remaining).toBe(10)

    await limiter.take("k1", 3)

    const after = await limiter.peek("k1")
    expect(after.remaining).toBe(7)
  })

  it("should reset a key", async () => {
    limiter = tokenBucket({ capacity: 5, refillRate: 1, refillInterval: "1s" })

    for (let i = 0; i < 5; i++) await limiter.take("k1")
    const empty = await limiter.take("k1")
    expect(empty.allowed).toBe(false)

    await limiter.reset("k1")

    const fresh = await limiter.take("k1")
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(4)
  })

  it("should isolate keys", async () => {
    limiter = tokenBucket({ capacity: 2, refillRate: 1, refillInterval: "1s" })

    await limiter.take("a")
    await limiter.take("a")
    const aDenied = await limiter.take("a")
    expect(aDenied.allowed).toBe(false)

    const bAllowed = await limiter.take("b")
    expect(bAllowed.allowed).toBe(true)
    expect(bAllowed.remaining).toBe(1)
  })

  it("should handle multi-token cost", async () => {
    limiter = tokenBucket({ capacity: 10, refillRate: 1, refillInterval: "1s" })

    const r1 = await limiter.take("k1", 3)
    expect(r1.remaining).toBe(7)

    const r2 = await limiter.take("k1", 5)
    expect(r2.remaining).toBe(2)

    const r3 = await limiter.take("k1", 5)
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(2)
  })
})
