import { EmailStatus, SendingAccountType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { encryptSecret } from "../lib/services/crypto";

async function main() {
  const resume = await prisma.resume.upsert({
    where: {
      id: "seed-resume"
    },
    update: {
      candidateName: "Chekkala Tilak",
      fileName: "Chekkala_Tilak_Resume.pdf",
      extractedText:
        "Full-stack engineer with experience in Next.js, Node.js, PostgreSQL, product engineering, email automation, recruiter outreach workflows, and scalable SaaS platforms."
    },
    create: {
      id: "seed-resume",
      candidateName: "Chekkala Tilak",
      fileName: "Chekkala_Tilak_Resume.pdf",
      extractedText:
        "Full-stack engineer with experience in Next.js, Node.js, PostgreSQL, product engineering, email automation, recruiter outreach workflows, and scalable SaaS platforms."
    }
  });

  const recruiters = await Promise.all(
    [
      { name: "Aarav Shah", email: "aarav@rocketlabs.ai", company: "Rocket Labs" },
      { name: "Maya Patel", email: "maya@northstarhq.com", company: "Northstar HQ" },
      { name: "Nina Gomez", email: "nina@brightloop.io", company: "BrightLoop" }
    ].map((recruiter) =>
      prisma.recruiter.upsert({
        where: { email: recruiter.email },
        update: recruiter,
        create: recruiter
      })
    )
  );

  const campaign = await prisma.campaign.upsert({
    where: {
      id: "seed-campaign"
    },
    update: {
      name: "Product Intern Outreach",
      description: "Seeded campaign with ready-to-review drafts.",
      delayMs: 3500,
      batchSize: 20,
      rotationSize: 20,
      retryLimit: 2
    },
    create: {
      id: "seed-campaign",
      name: "Product Intern Outreach",
      description: "Seeded campaign with ready-to-review drafts.",
      defaultSubject: "Entry-Level Software Opportunities at Rocket Labs",
      delayMs: 3500,
      batchSize: 20,
      rotationSize: 20,
      retryLimit: 2
    }
  });

  await prisma.sendingAccount.upsert({
    where: {
      email: "founder@talentflow.dev"
    },
    update: {
      fromName: "Chekkala Tilak"
    },
    create: {
      name: "Primary Gmail",
      type: SendingAccountType.GMAIL,
      fromName: "Chekkala Tilak",
      email: "founder@talentflow.dev",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      password: encryptSecret("app-password"),
      dailyLimit: 75,
      hourlyLimit: 20,
      isActive: true
    }
  });

  await Promise.all(
    recruiters.map((recruiter) =>
      prisma.emailLog.upsert({
        where: {
          campaignId_recruiterId: {
            campaignId: campaign.id,
            recruiterId: recruiter.id
          }
        },
        update: {},
        create: {
          recruiterId: recruiter.id,
          campaignId: campaign.id,
          subject: `Entry-Level Software Opportunities at ${recruiter.company}`,
          body: `<p>Dear ${recruiter.name},</p><p>I hope you are doing well.</p><p>I am Chekkala Tilak, a 2024 Computer Science graduate with internship experience in software development. I am reaching out to express my interest in fresher, entry-level, and software development opportunities at ${recruiter.company}.</p><p>Through my internships and projects, I have worked on backend systems, practical problem-solving, and product-focused features in fast-paced environments. I enjoy understanding user needs and contributing to meaningful products.</p><p>I would truly appreciate it if you could consider my profile for any suitable opportunities at ${recruiter.company}. Please let me know if any additional information is required from my side.</p><p>Thank you for your time and consideration.</p><p>Best regards,<br />Chekkala Tilak</p>`,
          trackingToken: `seed-${recruiter.id}`,
          status: EmailStatus.NOT_SENT
        }
      })
    )
  );

  const assistantConversation = await prisma.assistantConversation.findFirst({
    where: { isPrimary: true },
    select: { id: true }
  });

  if (!assistantConversation) {
    await prisma.assistantConversation.create({
      data: {
        isPrimary: true,
        title: "Job Outreach Copilot",
        messages: {
          create: {
            role: "ASSISTANT",
            content:
              "I am ready to help with recruiter outreach, LinkedIn messages, reply analysis, follow-up strategy, and best send times.",
            metadata: {
              suggestedActions: ["Ask for a LinkedIn DM", "Analyze a recruiter reply", "Plan follow-ups"]
            }
          }
        }
      }
    });
  }

  console.log("Seed complete", {
    resume: resume.id,
    campaign: campaign.id,
    recruiters: recruiters.length
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

