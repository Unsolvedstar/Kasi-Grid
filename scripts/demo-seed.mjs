// Creates a live verified outage for the judges' demo. Usage: node scripts/demo-seed.mjs [baseUrl] [suburb]
const base = process.argv[2] || 'http://localhost:3000'
const suburb = process.argv[3] || 'alex'
const devs = ['demo0001-aaaa-bbbb-cccc-000000000001', 'demo0002-aaaa-bbbb-cccc-000000000002', 'demo0003-aaaa-bbbb-cccc-000000000003']
const post = (path, device, body) =>
  fetch(base + '/api' + path, { method: 'POST', headers: { 'x-device-id': device, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
const { id } = await post('/reports', devs[0], { suburb, type: 'power', text: 'Power out on our street, transformer sparked' })
for (const d of devs.slice(1)) await post(`/reports/${id}/confirm`, d)
console.log(`Verified power outage created in ${suburb} (report ${id}). Open the Today tab.`)
