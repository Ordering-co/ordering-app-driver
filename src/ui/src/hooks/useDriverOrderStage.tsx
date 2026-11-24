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

/**
 * The same reading as the hook, for a place that has many orders and so cannot call a hook per order
 * (the Map tab groups its orders by store): the status the driver acts on, and whether it is the pickup phase.
 */
export const driverOrderStage = (order: any) => {
  const stage = order?.status === READY_FOR_PICKUP ? resolveStage(order) : null;

  return {
    effectiveStatus: stage ?? order?.status,
    isPickupPhase: stage !== null && PICKUP_STATUSES.includes(stage),
  };
};

export const useDriverOrderStage = (order: any) => driverOrderStage(order);
