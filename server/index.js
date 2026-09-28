import express from 'express'
import cors from 'cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.join(__dirname, 'data.json')
const app = express()
const clients = new Map()
app.use(cors())
app.use(express.json())

async function readData() { return JSON.parse(await fs.readFile(dataFile, 'utf8')) }
async function writeData(data) { await fs.writeFile(dataFile, JSON.stringify(data, null, 2)) }
function getEvent(data, id) { return data.events.find((event) => event.id === id) }
function getAnalytics(data, event) {
  const eventRsvps = data.rsvps.filter((rsvp) => rsvp.eventId === event.id)
  const counts = { going: event.counts.going, maybe: event.counts.maybe, notGoing: event.counts.notGoing }
  return { eventId: event.id, counts, capacity: event.capacity, available: Math.max(0, event.capacity - counts.going), utilization: Math.round((counts.going / event.capacity) * 100), responseRate: Math.round(((counts.going + counts.maybe + counts.notGoing) / Math.max(event.capacity, 1)) * 100), rsvpCount: eventRsvps.length }
}
function broadcast(event) { const listeners = clients.get(event.id) || []; const payload = `data: ${JSON.stringify({ event, analytics: getAnalytics(globalData, event) })}\n\n`; listeners.forEach((res) => res.write(payload)) }
let globalData = await readData()

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'gatherlive-api' }))
app.get('/api/events', async (req, res) => { globalData = await readData(); res.json({ events: globalData.events }) })
app.post('/api/events', async (req, res) => {
  const { title, description, date, venue, capacity, organizerId } = req.body
  if (!title || !description || !date || !venue || !Number.isInteger(capacity) || capacity < 1) return res.status(400).json({ error: 'Title, description, date, venue, and a positive capacity are required.' })
  const event = { id: `evt-${crypto.randomUUID().slice(0, 8)}`, organizerId: organizerId || 'demo-organizer', title, type: 'New event', description, date, venue, capacity, status: 'PUBLISHED', counts: { going: 0, maybe: 0, notGoing: 0 } }
  globalData.events.unshift(event); await writeData(globalData); res.status(201).json({ event })
})
app.get('/api/events/:id/analytics', async (req, res) => { globalData = await readData(); const event = getEvent(globalData, req.params.id); if (!event) return res.status(404).json({ error: 'Event not found.' }); res.json(getAnalytics(globalData, event)) })
app.get('/api/events/:id/announcements', async (req, res) => { globalData = await readData(); res.json({ announcements: globalData.announcements.filter((item) => item.eventId === req.params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }) })
app.post('/api/events/:id/announcements', async (req, res) => { const { title, message } = req.body; const event = getEvent(globalData, req.params.id); if (!event) return res.status(404).json({ error: 'Event not found.' }); if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' }); const announcement = { id: `ann-${crypto.randomUUID().slice(0, 8)}`, eventId: event.id, title, message, createdAt: new Date().toISOString() }; globalData.announcements.push(announcement); await writeData(globalData); res.status(201).json({ announcement }) })
app.post('/api/events/:id/rsvp', async (req, res) => {
  const { attendeeId = 'demo-attendee', status } = req.body
  const event = getEvent(globalData, req.params.id)
  if (!event) return res.status(404).json({ error: 'Event not found.' })
  if (!['GOING', 'MAYBE', 'NOT_GOING'].includes(status)) return res.status(400).json({ error: 'Choose Going, Maybe, or Not going.' })
  const existing = globalData.rsvps.find((item) => item.eventId === event.id && item.attendeeId === attendeeId)
  const previous = existing?.status
  const previousKey = previous === 'GOING' ? 'going' : previous === 'MAYBE' ? 'maybe' : previous === 'NOT_GOING' ? 'notGoing' : null
  const nextKey = status === 'GOING' ? 'going' : status === 'MAYBE' ? 'maybe' : 'notGoing'
  if (status === 'GOING' && previous !== 'GOING' && event.counts.going >= event.capacity) return res.status(409).json({ error: 'This event is at capacity. Join the waitlist from the invite page.' })
  if (previousKey) event.counts[previousKey] -= 1
  event.counts[nextKey] += 1
  if (existing) existing.status = status; else globalData.rsvps.push({ eventId: event.id, attendeeId, status })
  event.status = event.counts.going >= event.capacity ? 'FULL' : 'PUBLISHED'
  await writeData(globalData); broadcast(event); res.json({ rsvp: { eventId: event.id, attendeeId, status }, event })
})
app.get('/api/events/:id/stream', (req, res) => { const event = globalData.events.find((item) => item.id === req.params.id); if (!event) return res.status(404).end(); res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders(); const listeners = clients.get(event.id) || []; listeners.push(res); clients.set(event.id, listeners); res.write(`data: ${JSON.stringify({ event, analytics: getAnalytics(globalData, event) })}\n\n`); req.on('close', () => clients.set(event.id, (clients.get(event.id) || []).filter((client) => client !== res))) })

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`GatherLive API running on http://localhost:${port}`))
