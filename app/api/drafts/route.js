const defaults = require("../../../src/shared/defaults");
const llm = require("../../../src/shared/llmAssistant");

async function POST(request) {
  try {
    const body = await request.json();
    const drafts = await llm.generateDrafts({
      settings: {
        ...defaults.aiSettings,
        ...(body.settings || {})
      },
      profile: {
        ...defaults.profile,
        ...(body.profile || {})
      },
      job: body.job || {}
    });
    return Response.json({ drafts });
  } catch (error) {
    return Response.json({ error: error.message || "Draft generation failed." }, { status: 500 });
  }
}

module.exports = { POST };
