export interface InitialData {
  initialCount: number;
  message: string;
}

export interface HomeState extends InitialData {
  count: number;
}

export function parseInitialData(value: unknown): InitialData {
  if (
    typeof value !== 'object' || value === null ||
    !('initialCount' in value) || !Number.isSafeInteger(value.initialCount) ||
    !('message' in value) || typeof value.message !== 'string'
  ) {
    throw new Error('Invalid initial data');
  }
  return { initialCount: value.initialCount as number, message: value.message };
}
