const AgentProfile = require('../models/AgentProfile');
const { decryptToken } = require('./tokenCrypto');

async function getAgentIgCredentials(userId) {
  const profile = await AgentProfile.findOne({ user: userId }).select(
    '+metaAccessTokenEnc instagramUserId instagramUsername'
  );
  if (!profile?.instagramUserId || !profile.metaAccessTokenEnc) {
    return null;
  }
  return {
    igUserId: profile.instagramUserId,
    username: profile.instagramUsername,
    accessToken: decryptToken(profile.metaAccessTokenEnc),
  };
}

module.exports = { getAgentIgCredentials };
