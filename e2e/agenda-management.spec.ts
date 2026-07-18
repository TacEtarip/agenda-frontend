import { expect, test } from '@playwright/test';

interface AppointmentFixture {
  id: string;
  clientId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'expired';
  scheduleConflicts: [];
}

const tomorrow = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isoAt = (date: string, time: string): string => new Date(`${date}T${time}`).toISOString();

const setDatetimeValue = async (
  page: import('@playwright/test').Page,
  testId: string,
  value: string,
): Promise<void> => {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    (element as HTMLIonDatetimeElement).value = nextValue;
    element.dispatchEvent(
      new CustomEvent('ionChange', {
        bubbles: true,
        composed: true,
        detail: { value: nextValue },
      }),
    );
  }, value);
};

test('crea, reprograma y cancela una cita desde Agenda', async ({ page }) => {
  const jwtPayload = Buffer.from(
    JSON.stringify({
      sub: 'user-e2e',
      email: 'agenda@e2e.test',
      companyName: 'Agenda E2E',
      exp: 4_102_444_800,
    }),
  ).toString('base64url');
  const token = `e2e.${jwtPayload}.signature`;
  let appointments: AppointmentFixture[] = [];

  await page.addInitScript((accessToken) => {
    localStorage.setItem('agenda_access_token', accessToken);
  }, token);

  await page.route('**/clients', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'client-e2e',
          firstName: 'Ana',
          lastName: 'Torres',
          email: 'ana@e2e.test',
          phone: '+51999999999',
          initials: 'AT',
          color: '#047857',
          stage: 'FIRST_CONTACT',
        },
      ]),
    });
  });

  await page.route('**/appointments**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/appointments/availability') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true, externalCalendarChecked: true, conflicts: [] }),
      });
      return;
    }

    if (request.method() === 'GET' && url.pathname === '/appointments') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(appointments),
      });
      return;
    }

    if (request.method() === 'POST' && url.pathname === '/appointments') {
      const payload = request.postDataJSON() as Omit<
        AppointmentFixture,
        'id' | 'userId' | 'status' | 'scheduleConflicts'
      >;
      const created: AppointmentFixture = {
        ...payload,
        id: 'appointment-e2e',
        userId: 'user-e2e',
        status: 'scheduled',
        scheduleConflicts: [],
      };
      appointments = [created];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    if (request.method() === 'PUT') {
      const id = url.pathname.split('/').at(-1)!;
      const payload = request.postDataJSON() as Partial<AppointmentFixture>;
      appointments = appointments.map((appointment) =>
        appointment.id === id ? { ...appointment, ...payload } : appointment,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(appointments.find((appointment) => appointment.id === id)),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  await expect(page.locator('ion-back-button')).toBeVisible();
  await page.locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/agenda');

  await page.getByTestId('new-appointment').click();
  await expect(page.getByTestId('appointment-editor')).toBeVisible();

  await page.getByTestId('appointment-client').click();
  await page.getByText('Ana Torres', { exact: true }).last().click();
  await page.getByTestId('appointment-title').locator('input').fill('Consulta E2E');
  await page.getByTestId('appointment-description').locator('textarea').fill('Creada desde Agenda');
  await setDatetimeValue(page, 'appointment-date', tomorrow());
  await setDatetimeValue(page, 'appointment-start-time', '14:00');
  await setDatetimeValue(page, 'appointment-end-time', '15:00');
  await expect(page.getByText('Horario disponible en Agenda y Google Calendar.')).toBeVisible();
  await page.getByTestId('save-appointment').click();

  await expect(page.getByText('Cita creada y añadida a la Agenda.')).toBeVisible();
  await expect(page.locator('article:visible').filter({ hasText: 'Consulta E2E' })).toBeVisible();

  const event = page.locator('article:visible').filter({ hasText: 'Consulta E2E' });
  await event.getByRole('button', { name: 'Editar' }).click();
  await setDatetimeValue(page, 'appointment-start-time', '15:30');
  await setDatetimeValue(page, 'appointment-end-time', '16:30');
  await expect(page.getByText('Horario disponible en Agenda y Google Calendar.')).toBeVisible();
  await page.getByTestId('save-appointment').click();
  await expect(page.getByText('Cita actualizada.')).toBeVisible();
  expect(appointments[0].startTime).toBe(isoAt(tomorrow(), '15:30'));

  await page
    .locator('article:visible')
    .filter({ hasText: 'Consulta E2E' })
    .getByRole('button', { name: 'Editar' })
    .click();
  await page.getByTestId('cancel-appointment').click();
  await page.getByRole('button', { name: 'Sí, cancelar cita' }).click();

  await expect(page.getByText('Cita cancelada.', { exact: true })).toBeVisible();
  await expect(page.locator('article:visible').filter({ hasText: 'Consulta E2E' })).toHaveCount(0);
  expect(appointments[0].status).toBe('cancelled');
});
