import {
  getPaymentForBillingPeriod,
  getRecurringAmount,
  getRecurringDueDate,
} from './paymentSchedule.js';
import {
  getPaymentStatus,
  getRoomDisplayPaymentStatus,
} from './paymentStatus.js';
import { sortRoomsForDisplay } from './rooms.js';

export function buildProperties({
  buildings,
  rooms,
  tenants,
  contracts,
  rentPayments,
  utilityPayments,
  billingPeriod,
}) {
  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    address: building.address,
    rooms: rooms
      .filter((room) => room.building_id === building.id)
      .map((room) => {
        const activeContract = contracts.find(
          (contract) => contract.room_id === room.id && contract.status === 'active',
        );
        const activeRentPayments = rentPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const activeUtilityPayments = utilityPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const latestRentPayment = getPaymentForBillingPeriod(activeRentPayments, billingPeriod);
        const waterPayments = activeUtilityPayments.filter(
          (payment) => payment.utility_type === 'water',
        );
        const lightPayments = activeUtilityPayments.filter(
          (payment) => payment.utility_type === 'electricity',
        );
        const latestWaterPayment = getPaymentForBillingPeriod(waterPayments, billingPeriod);
        const latestLightPayment = getPaymentForBillingPeriod(lightPayments, billingPeriod);
        const tenant = tenants.find((tenantRecord) => tenantRecord.id === activeContract?.tenant_id);
        const nestedTenant = Array.isArray(activeContract?.tenants)
          ? activeContract.tenants[0]
          : activeContract?.tenants;
        const tenantName = tenant?.full_name ?? nestedTenant?.full_name ?? null;

        return {
          id: room.id,
          number: room.room_name,
          buildingName: building.name,
          contractId: activeContract?.id ?? null,
          tenantId: activeContract?.tenant_id ?? null,
          rentPaymentId: latestRentPayment?.id ?? null,
          waterPaymentId: latestWaterPayment?.id ?? null,
          lightPaymentId: latestLightPayment?.id ?? null,
          tenant: tenantName,
          movedIn: activeContract?.start_date ?? '',
          contractEnds: activeContract?.end_date ?? '',
          dueDay: activeContract?.due_day ?? '',
          monthlyRent: room.monthly_rent,
          rentAmount: latestRentPayment?.amount_due ?? room.monthly_rent ?? '',
          rentPaid: latestRentPayment?.amount_paid ?? '',
          rentStatus:
            latestRentPayment?.status ??
            getPaymentStatus(activeContract, latestRentPayment ? [latestRentPayment] : []),
          rentDueDate: getRecurringDueDate(
            activeRentPayments,
            billingPeriod,
            activeContract?.due_day,
          ),
          waterAmount: getRecurringAmount(waterPayments, billingPeriod),
          waterPaid: latestWaterPayment?.amount_paid ?? '',
          waterStatus:
            latestWaterPayment?.status ??
            getPaymentStatus(activeContract, latestWaterPayment ? [latestWaterPayment] : []),
          waterDueDate: getRecurringDueDate(waterPayments, billingPeriod),
          lightAmount: getRecurringAmount(lightPayments, billingPeriod),
          lightPaid: latestLightPayment?.amount_paid ?? '',
          lightStatus:
            latestLightPayment?.status ??
            getPaymentStatus(activeContract, latestLightPayment ? [latestLightPayment] : []),
          lightDueDate: getRecurringDueDate(lightPayments, billingPeriod),
          status: room.status,
          payments: {
            rent: getRoomDisplayPaymentStatus(
              room.status,
              activeContract,
              latestRentPayment ? [latestRentPayment] : [],
            ),
            light: getRoomDisplayPaymentStatus(
              room.status,
              activeContract,
              latestLightPayment ? [latestLightPayment] : [],
            ),
            water: getRoomDisplayPaymentStatus(
              room.status,
              activeContract,
              latestWaterPayment ? [latestWaterPayment] : [],
            ),
          },
        };
      })
      .sort(sortRoomsForDisplay),
  }));
}
