const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AgentProfile = require('../models/AgentProfile');
const { normalizeRole } = require('../middleware/roles');

const router = express.Router();
const googleClient = new OAuth2Client();

function resolveRoleForEmail(email, requestedRole) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (adminEmail && email.toLowerCase() === adminEmail) return 'admin';
  if (requestedRole === 'customer') return 'customer';
  // publisher (default); accept legacy owner/agent from old clients
  if (
    requestedRole === 'publisher' ||
    requestedRole === 'owner' ||
    requestedRole === 'agent' ||
    !requestedRole
  ) {
    return 'publisher';
  }
  return 'publisher';
}

function signToken(user) {
  const role = normalizeRole(user);
  return jwt.sign(
    { id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function publicUser(user) {
  const role = normalizeRole(user);
  const base = {
    id: user._id,
    name: user.name,
    email: user.email,
    role,
    authProvider: user.authProvider,
    onboardingComplete: true,
  };

  if (role === 'publisher') {
    const profile = await AgentProfile.findOne({ user: user._id }).select('onboardingComplete');
    base.onboardingComplete = !!profile?.onboardingComplete;
  }

  return base;
}

function googleAudiences() {
  const raw = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role: requestedRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const role = resolveRoleForEmail(email, requestedRole);
    const user = await User.create({
      name,
      email,
      password,
      role,
      authProvider: 'local',
    });

    if (role === 'publisher') {
      await AgentProfile.create({ user: user._id });
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: await publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({
        message: 'This account uses Google sign-in. Please continue with Google.',
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Promote configured admin email / migrate legacy roles
    let dirty = false;
    const desired = resolveRoleForEmail(user.email, user.role);
    if (desired === 'admin' && user.role !== 'admin') {
      user.role = 'admin';
      dirty = true;
    } else if (['agent', 'owner', 'sales'].includes(user.role)) {
      user.role = 'publisher';
      dirty = true;
    }
    if (dirty) await user.save();

    if (normalizeRole(user) === 'publisher') {
      const existing = await AgentProfile.findOne({ user: user._id });
      if (!existing) await AgentProfile.create({ user: user._id });
    }

    const token = signToken(user);
    res.json({
      token,
      user: await publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken, role: requestedRole } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google idToken is required' });
    }

    const audiences = googleAudiences();
    if (!audiences.length) {
      return res.status(500).json({ message: 'Google sign-in is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: audiences,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      return res.status(401).json({ message: 'Invalid Google token payload' });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ message: 'Google email is not verified' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }],
    });

    if (user) {
      let dirty = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        dirty = true;
      }
      if (user.authProvider !== 'google' && !user.password) {
        user.authProvider = 'google';
        dirty = true;
      }
      if (payload.name && user.name !== payload.name) {
        user.name = payload.name;
        dirty = true;
      }
      const desired = resolveRoleForEmail(email, user.role);
      if (desired === 'admin' && user.role !== 'admin') {
        user.role = 'admin';
        dirty = true;
      } else if (['agent', 'owner', 'sales'].includes(user.role)) {
        user.role = 'publisher';
        dirty = true;
      }
      if (dirty) await user.save();
    } else {
      const role = resolveRoleForEmail(email, requestedRole);
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        authProvider: 'google',
        role,
      });
      if (role === 'publisher') {
        await AgentProfile.create({ user: user._id });
      }
    }

    if (normalizeRole(user) === 'publisher') {
      const existing = await AgentProfile.findOne({ user: user._id });
      if (!existing) await AgentProfile.create({ user: user._id });
    }

    const token = signToken(user);
    res.json({
      token,
      user: await publicUser(user),
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

module.exports = router;
