const DRIVER_STATUSES = [3, 8, 9, 18, 19, 23, 26];

const PICKUP_STATUSES = [3, 8, 18];

const READY_FOR_PICKUP = 4;

const parseDate = (value: any) =>
  typeof value === 'string' ? value.replace('T', ' ').slice(0, 19) : '';

const resolveStage = (order: any) => {
  const reachedAt = order?.reporting_data?.at ?? {};
  const assignedAt = parseDate(order?.last_driver_assigned_at);

  let stage = null;
  let stageAt = '';

  DRIVER_STATUSES.forEach((status: number) => {
    const statusAt = parseDate(reachedAt[`status:${status}`]);
    if (!statusAt || statusAt < assignedAt || statusAt < stageAt) return;
    stage = status;
    stageAt = statusAt;
  });

  return stage;
};

export const useDriverOrderStage = (order: any) => {
  const stage = order?.status === READY_FOR_PICKUP ? resolveStage(order) : null;

  return {
    effectiveStatus: stage ?? order?.status,
    isPickupPhase: stage !== null && PICKUP_STATUSES.includes(stage),
  };
};
