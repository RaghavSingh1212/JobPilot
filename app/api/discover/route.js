const defaults = require("../../../src/shared/defaults");
const discovery = require("../../../src/shared/jobDiscovery");
const matcher = require("../../../src/shared/matcher");

async function POST(request) {
  try {
    const body = await request.json();
    const jobs = await discovery.discoverAll({
      companySources: body.companySources || defaults.companySources,
      simplifySources: body.simplifySources || defaults.simplifySources,
      webSearchSettings: {
        ...defaults.webSearchSettings,
        ...(body.webSearchSettings || {})
      },
      profiles: body.searchProfiles || defaults.searchProfiles,
      matcher
    });
    return Response.json({
      discoveredJobs: jobs.slice(0, 250),
      todayJobs: jobs.filter((job) => discovery.isTodayJob(job)).slice(0, 100),
      lastDiscoveryAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message || "Discovery failed." }, { status: 500 });
  }
}

module.exports = { POST };
