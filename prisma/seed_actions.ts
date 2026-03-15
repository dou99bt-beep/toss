import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedActions() {
  const arm = await prisma.armRegistry.findFirst();
  if (!arm) return;

  const rule = await prisma.automationRule.create({
    data: {
      name: 'Default Decision Engine',
      condition_json: '{}',
      action_type: 'HOLD',
      is_active: true
    }
  });

  await prisma.recommendedAction.createMany({
    data: [
      {
        arm_id: arm.id,
        rule_id: rule.id,
        action_type: 'BUDGET_UP',
        reason: '성공 확률이 85.2%로 매우 높고 3일 CPA가 목표치 이하입니다. 예산을 15% 증액합니다.',
        status: 'PENDING'
      },
      {
        arm_id: arm.id,
        rule_id: rule.id,
        action_type: 'PAUSE',
        reason: '비용(25000원)이 목표 CPA(15000원)의 1.5배를 초과했으나 리드가 없습니다.',
        status: 'PENDING'
      },
      {
        arm_id: arm.id,
        rule_id: rule.id,
        action_type: 'BUDGET_DOWN',
        reason: '최근 3일 CPA(18000원)가 목표를 초과하며 개선 확률이 낮습니다. 예산을 20% 감액하여 리스크를 줄입니다.',
        status: 'EXECUTED'
      }
    ]
  });
  console.log('Seeded actions');
}

seedActions().finally(() => prisma.$disconnect());
