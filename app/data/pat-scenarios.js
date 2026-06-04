//
// Seed data for the "Review PAT submission" page (build brief §6.1).
//
// Order is significant and matches the brief exactly. Note there is
// deliberately NO R06 — do not insert one.
//
// `error: true` rows are "error scenarios": their WT ID input is disabled and
// they are never submitted or assessed (that is why 14 rows -> 12 submitted).
//
// NOTE: R01's default WT ID is a valid value here. The "Error: WT ID not found"
// simulate mode demonstrates the not-found response by flagging the first
// submitted row when no genuinely-malformed ID is present (see application.js).

module.exports = [
  { id: 'R01', description: 'Basic Waste receipt – single waste item', wtId: 'WT1' },
  { id: 'R02', description: 'Basic waste receipt – with multiple waste items', wtId: 'WT2' },
  { id: 'R03', description: "Basic Waste receipt – with means of transport 'Road'", wtId: 'WT3' },
  { id: 'R04', description: "Basic waste Receipt – with no 'Disposal or Recovery' codes", wtId: 'WT4' },
  { id: 'R05', description: "Basic waste Receipt – with multiple 'Disposal or Recovery' codes", wtId: 'WT5' },
  { id: 'R07', description: 'Basic waste Receipt – with Dual EWC codes', wtId: 'WT6' },
  { id: 'C01', description: 'Basic waste Receipt – with no Carrier registration number and no reason', wtId: '', error: true },
  { id: 'C02', description: 'Basic waste Receipt – with no Carrier registration number and reason', wtId: 'WT7' },
  { id: 'B01', description: 'Basic waste Receipt – with a Broker / Dealer', wtId: 'WT8' },
  { id: 'P01', description: 'POPs Waste Receipt – multiple POPs components', wtId: 'WT9' },
  { id: 'H01', description: 'Hazardous Waste Receipt – multiple hazardous components', wtId: 'WT10' },
  { id: 'H02', description: 'Hazardous Waste Receipt – with no Consignment Note Code and no reason', wtId: '', error: true },
  { id: 'H03', description: 'Hazardous Waste Receipt – with no Consignment Note Code and a reason', wtId: 'WT11' },
  { id: 'X01', description: 'Hazardous & POPs Waste Receipt', wtId: 'WT12' }
]
