// Shared MongoDB aggregation stages for meter telemetry.
export const TZ = 'Asia/Kolkata';
export const VOLTAGE_MIN = 216.2; // 230 V nominal -6 %
export const VOLTAGE_MAX = 243.8; // 230 V nominal +6 %

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Start of the day (IST) `days - 1` days ago, so every day in the window is complete. */
export function sinceDays(days) {
  const startOfTodayIst = Math.floor((Date.now() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return new Date(startOfTodayIst - (days - 1) * DAY_MS);
}

/** Daily totals, hourly profile and a summary for a set of meters in one round trip ($facet). */
export function usagePipeline(meterIds, since) {
  return [
    { $match: { 'meta.meter_id': { $in: meterIds }, ts: { $gte: since } } },
    { $facet: {
        daily: [
          { $group: {
              _id: { $dateTrunc: { date: '$ts', unit: 'day', timezone: TZ } },
              kwh: { $sum: '$kwh' },
              peak_kwh: { $max: '$kwh' },
              avg_voltage: { $avg: '$voltage' },
          } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, day: { $dateToString: { date: '$_id', format: '%Y-%m-%d', timezone: TZ } },
                        kwh: { $round: ['$kwh', 2] }, peak_kwh: { $round: ['$peak_kwh', 2] },
                        avg_voltage: { $round: ['$avg_voltage', 1] } } },
        ],
        hourly: [
          { $group: { _id: { $hour: { date: '$ts', timezone: TZ } }, avg_kwh: { $avg: '$kwh' } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, hour: '$_id', avg_kwh: { $round: ['$avg_kwh', 3] } } },
        ],
        summary: [
          { $group: {
              _id: null,
              total_kwh: { $sum: '$kwh' },
              readings: { $sum: 1 },
              avg_voltage: { $avg: '$voltage' },
              avg_pf: { $avg: '$power_factor' },
              voltage_issues: { $sum: { $cond: [
                { $or: [{ $lt: ['$voltage', VOLTAGE_MIN] }, { $gt: ['$voltage', VOLTAGE_MAX] }] }, 1, 0] } },
              first: { $min: '$ts' },
              last: { $max: '$ts' },
          } },
          { $project: { _id: 0, total_kwh: { $round: ['$total_kwh', 2] }, readings: 1,
                        avg_voltage: { $round: ['$avg_voltage', 1] }, avg_pf: { $round: ['$avg_pf', 3] },
                        voltage_issues: 1, first: 1, last: 1 } },
        ],
    } },
  ];
}
