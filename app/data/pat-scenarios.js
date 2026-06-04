//
// Seed data for the "Review PAT submission" page (build brief §6.1).
//
// Order is significant and matches the brief exactly. Note there is
// deliberately NO R06 — do not insert one.
//
// `error: true` rows are "error scenarios": their WT ID input is disabled and
// they are never submitted or assessed (that is why 14 rows -> 12 submitted).
//
// The WT IDs use the real Digital Waste Tracking Receipt API `wasteTrackingId`
// format (8-character alphanumeric, e.g. "25HRA0B2"), as returned by
// POST /movements/receive. Each PAT scenario corresponds to a movement
// submitted to that endpoint.

module.exports = [
  { id: 'R01', description: 'Basic Waste receipt – single waste item', wtId: '25HRA0B2' },
  { id: 'R02', description: 'Basic waste receipt – with multiple waste items', wtId: '25KP9M41' },
  { id: 'R03', description: "Basic Waste receipt – with means of transport 'Road'", wtId: '25TX72L9' },
  { id: 'R04', description: "Basic waste Receipt – with no 'Disposal or Recovery' codes", wtId: '25BN84C3' },
  { id: 'R05', description: "Basic waste Receipt – with multiple 'Disposal or Recovery' codes", wtId: '25PR16V0' },
  { id: 'R07', description: 'Basic waste Receipt – with Dual EWC codes', wtId: '25MJ37H5' },
  { id: 'C01', description: 'Basic waste Receipt – with no Carrier registration number and no reason', wtId: '', error: true },
  { id: 'C02', description: 'Basic waste Receipt – with no Carrier registration number and reason', wtId: '25WD82F4' },
  { id: 'B01', description: 'Basic waste Receipt – with a Broker / Dealer', wtId: '25QZ59K1' },
  { id: 'P01', description: 'POPs Waste Receipt – multiple POPs components', wtId: '25LG03B7' },
  { id: 'H01', description: 'Hazardous Waste Receipt – multiple hazardous components', wtId: '25NY64T2' },
  { id: 'H02', description: 'Hazardous Waste Receipt – with no Consignment Note Code and no reason', wtId: '', error: true },
  { id: 'H03', description: 'Hazardous Waste Receipt – with no Consignment Note Code and a reason', wtId: '25CH28M9' },
  { id: 'X01', description: 'Hazardous & POPs Waste Receipt', wtId: '25RP71X5' }
]
