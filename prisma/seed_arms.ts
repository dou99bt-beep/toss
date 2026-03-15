import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const campaign = await prisma.campaign.upsert({
    where: { toss_campaign_id: 'C-123' },
    update: {},
    create: {
      toss_campaign_id: 'C-123',
      name: '직장인_대출_캠페인',
      budget: 1500000,
      status: 'ACTIVE',
    }
  });

  const adSet = await prisma.adSet.upsert({
    where: { toss_adset_id: 'AS-123' },
    update: {},
    create: {
      toss_adset_id: 'AS-123',
      campaign_id: campaign.id,
      name: '2030_남성_출근시간',
      status: 'ACTIVE',
      target_cpa: 15000,
    }
  });

  const creative = await prisma.creative.upsert({
    where: { toss_creative_id: 'CR-123' },
    update: {},
    create: {
      toss_creative_id: 'CR-123',
      ad_set_id: adSet.id,
      type: 'IMAGE',
      content: 'https://example.com/image.png',
    }
  });

  const audience = await prisma.audience.create({
    data: {
      name: '2030 남성',
      age_min: 20,
      age_max: 39,
      gender: 'MALE',
    }
  });

  const schedule = await prisma.schedule.create({
    data: {
      day_of_week: 'MON-FRI',
      start_hour: 7,
      end_hour: 9,
    }
  });

  const arm = await prisma.armRegistry.create({
    data: {
      ad_set_id: adSet.id,
      creative_id: creative.id,
      audience_id: audience.id,
      schedule_id: schedule.id,
      status: 'ACTIVE',
    }
  });

  console.log('Seeded arm:', arm.id);
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
