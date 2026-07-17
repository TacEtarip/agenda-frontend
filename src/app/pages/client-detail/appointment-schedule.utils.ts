export function validateAppointmentSchedule(
  startTime: Date,
  endTime: Date,
  now = new Date(),
): string | null {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return 'Fecha u hora inválidas.';
  }

  if (startTime.getTime() < now.getTime()) {
    return 'La fecha y hora de inicio no pueden estar en el pasado.';
  }

  if (endTime.getTime() <= startTime.getTime()) {
    return 'La hora de fin debe ser mayor que la de inicio.';
  }

  return null;
}

export function roundUpToNextMinutes(date: Date, intervalMinutes: number): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % intervalMinutes;
  rounded.setMinutes(
    rounded.getMinutes() + (remainder === 0 ? intervalMinutes : intervalMinutes - remainder),
  );
  return rounded;
}
