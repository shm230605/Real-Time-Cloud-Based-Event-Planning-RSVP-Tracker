import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const data = JSON.parse(await fs.readFile(new URL('../server/data.json', import.meta.url), 'utf8'))

test('seed data contains publishable events', () => {
  assert.equal(data.events.length, 3)
  assert.ok(data.events.every((event) => event.status === 'PUBLISHED'))
  assert.ok(data.events.every((event) => event.capacity > event.counts.going))
})

test('seed RSVP is unique per event and attendee', () => {
  const keys = data.rsvps.map((rsvp) => `${rsvp.eventId}:${rsvp.attendeeId}`)
  assert.equal(new Set(keys).size, keys.length)
})

test('event counters never exceed capacity in seed state', () => {
  for (const event of data.events) assert.ok(event.counts.going <= event.capacity)
})
