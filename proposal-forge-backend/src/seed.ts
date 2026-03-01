/**
 * Seeder: creates admin and sales users for testing.
 * Run: npm run seed
 * Requires: MongoDB running, MONGODB_URI in .env (or default localhost).
 *
 * Test logins (password for both: password123):
 *   - Admin:  admin@proposalforge.com
 *   - Sales:  sales@proposalforge.com
 *
 * Includes a full dummy proposal at /proposals/69a340840c7947c15c8b1411 for testing
 * the proposal editor UI without using AI APIs.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User";
import { Proposal } from "./models/Proposal";
import { config } from "./config/index";

dotenv.config();

const SEED_USERS = [
  { email: "admin@proposalforge.com", password: "password123", role: "admin" as const },
  { email: "sales@proposalforge.com", password: "password123", role: "sales" as const },
];

const SEED_PROPOSALS = [
  { title: "Q1 Enterprise Package", status: "sent" as const },
  { title: "Website Redesign Proposal", status: "draft" as const },
  { title: "Support Retainer Agreement", status: "accepted" as const },
];

/** Full dummy proposal content for testing UI at /proposals/69a340840c7947c15c8b1411 (no AI needed) */
const DUMMY_PROPOSAL_ID = "69a340840c7947c15c8b1411";

const DUMMY_PROPOSAL_CONTENT = {
  client_summary:
    "Acme Corp needs a custom CRM and customer portal with SSO, reporting, and mobile-friendly UI. They want a phased rollout over 6 months with clear milestones and support options.",
  summary_comment: "",
  extracted_modules: [
    { module_name: "User & SSO", description: "Authentication, roles, and single sign-on integration with existing IdP." },
    { module_name: "CRM Core", description: "Contacts, companies, deals pipeline, and activity tracking." },
    { module_name: "Customer Portal", description: "Self-service portal for clients: tickets, documents, and basic reporting." },
    { module_name: "Reporting & Analytics", description: "Dashboards, exports, and scheduled reports." },
  ],
  ai_enhanced_modules: [
    {
      original_module_name: "User & SSO",
      enhanced_name: "Enterprise Identity & Access",
      improvements: ["SAML 2.0 and OIDC support", "MFA and session policies", "Audit logs for access events"],
      why_better: "Aligns with enterprise security and compliance expectations.",
      accepted: true,
    },
    {
      original_module_name: "CRM Core",
      enhanced_name: "Smart CRM with Automation",
      improvements: ["Workflow automation", "Lead scoring", "Email and calendar sync"],
      why_better: "Reduces manual work and improves conversion visibility.",
      accepted: true,
    },
    {
      original_module_name: "Customer Portal",
      enhanced_name: "Branded Client Experience Portal",
      improvements: ["White-label theming", "Custom branding and domains", "Multi-language support"],
      why_better: "Consistent brand experience and scalability for global clients.",
      accepted: true,
    },
  ],
  modules_comment: "",
  phased_roadmap: [
    { phase: "Discovery & Design", description: "Requirements finalization, UX/UI design, and technical architecture sign-off.", duration_weeks: 3 },
    { phase: "Core Build", description: "SSO, CRM core, and portal MVP with key workflows and reporting.", duration_weeks: 10 },
    { phase: "Launch & Support", description: "UAT, go-live, training, and 30-day hypercare support.", duration_weeks: 3 },
  ],
  roadmap_comment: "",
  pricing_options: [
    {
      option_name: "Starter",
      total_price_usd: 45000,
      breakdown: [
        { item: "Discovery & Design", cost_usd: 8000 },
        { item: "Core Build (MVP)", cost_usd: 32000 },
        { item: "Launch & Support", cost_usd: 5000 },
      ],
      discount_percent: 0,
    },
    {
      option_name: "Growth",
      total_price_usd: 62000,
      breakdown: [
        { item: "Discovery & Design", cost_usd: 9000 },
        { item: "Core Build (full scope)", cost_usd: 46000 },
        { item: "Launch & 60-day support", cost_usd: 7000 },
      ],
      discount_percent: 5,
    },
    {
      option_name: "Enterprise",
      total_price_usd: 85000,
      breakdown: [
        { item: "Discovery & Design", cost_usd: 12000 },
        { item: "Core Build + integrations", cost_usd: 63000 },
        { item: "Launch & 90-day support", cost_usd: 10000 },
      ],
      discount_percent: 10,
    },
  ],
  pricing_comment: "",
  final_proposal_text: `# Software Development Proposal – Acme Corp

## Executive Summary

This proposal outlines a phased approach to deliver a **custom CRM and customer portal** with single sign-on, reporting, and a mobile-friendly experience. We recommend the **Growth** package for the best balance of scope and support.

---

## Client Requirements Summary

Acme Corp needs:
- **SSO** integration with their existing identity provider
- **CRM** with contacts, companies, deals, and activity tracking
- **Customer portal** for self-service tickets, documents, and reporting
- **Reporting & analytics** with dashboards and scheduled reports
- Phased rollout over **6 months** with clear milestones

---

## Proposed Solution

### Modules

1. **Enterprise Identity & Access** – SAML 2.0/OIDC, MFA, audit logs  
2. **Smart CRM with Automation** – Workflows, lead scoring, email/calendar sync  
3. **Branded Client Experience Portal** – White-label, custom domains, multi-language  

### Phased Roadmap

| Phase | Duration | Description |
|-------|----------|-------------|
| Discovery & Design | 3 weeks | Requirements, UX/UI, architecture sign-off |
| Core Build | 10 weeks | SSO, CRM, portal MVP, reporting |
| Launch & Support | 3 weeks | UAT, go-live, training, hypercare |

---

## Pricing Options

- **Starter** – $45,000 (MVP + 30-day support)  
- **Growth** – $62,000 (full scope + 60-day support, 5% discount)  
- **Enterprise** – $85,000 (integrations + 90-day support, 10% discount)  

---

## Next Steps

1. Confirm preferred package and timeline.  
2. Kick off Discovery & Design with a signed SOW.  
3. Weekly checkpoints during Core Build; UAT in week 13.  

We look forward to partnering with Acme Corp on this engagement.`,
};

async function seed() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", (err as Error).message);
    process.exit(1);
  }

  const SALT_ROUNDS = 10;
  let adminId: mongoose.Types.ObjectId | null = null;
  let salesId: mongoose.Types.ObjectId | null = null;

  for (const { email, password, role } of SEED_USERS) {
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      user = await User.create({
        email: email.toLowerCase(),
        password: passwordHash,
        role,
      });
      console.log(`Created ${role} user: ${email}`);
    }
    if (role === "admin") adminId = user._id;
    else salesId = user._id;
  }

  const proposalCount = await Proposal.countDocuments();
  if (proposalCount === 0 && adminId && salesId) {
    for (const p of SEED_PROPOSALS) {
      await Proposal.create({
        title: p.title,
        userId: adminId,
        status: p.status,
      });
    }
    await Proposal.create({ title: "Sales Demo Proposal", userId: salesId, status: "draft" });
    console.log("Created sample proposals for dashboard");
  }

  // Upsert full dummy proposal for testing UI without AI (view at /proposals/69a340840c7947c15c8b1411)
  if (adminId) {
    const dummyId = new mongoose.Types.ObjectId(DUMMY_PROPOSAL_ID);
    await Proposal.findByIdAndUpdate(
      dummyId,
      {
        $set: {
          title: "Acme Corp – CRM & Customer Portal (Demo)",
          clientName: "Acme Corp",
          clientInput:
            "We need a custom CRM and customer portal with SSO, reporting, and mobile-friendly UI. Phased rollout over 6 months.",
          userId: adminId,
          status: "draft",
          content: DUMMY_PROPOSAL_CONTENT,
        },
      },
      { upsert: true, new: true }
    );
    console.log("Upserted dummy proposal for testing: /proposals/" + DUMMY_PROPOSAL_ID);
  }

  console.log("Seed completed. You can login with:");
  console.log("  Admin: admin@proposalforge.com / password123");
  console.log("  Sales: sales@proposalforge.com / password123");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
